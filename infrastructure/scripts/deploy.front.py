import os
import sys
import time
import json
import boto3
import subprocess
import mimetypes
from dotenv import load_dotenv

if len(sys.argv) < 2:
    print("Usage: python deploy.front.py <env> [app]")
    print("  env: staging | prod")
    print("  app: trellu | trellu_admin (optional, deploys both by default)")
    sys.exit(1)

ENV = sys.argv[1]
if ENV not in ["staging", "prod"]:
    print(f"Invalid environment: {ENV}")
    sys.exit(1)

APP_FILTER = sys.argv[2] if len(sys.argv) > 2 else None
VALID_APPS = ["trellu", "trellu_admin"]
if APP_FILTER and APP_FILTER not in VALID_APPS:
    print(f"Invalid app: {APP_FILTER}")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
CODE_DIR = f"{ROOT_DIR}/code"

load_dotenv(f"{ROOT_DIR}/.env")

with open(f"{ROOT_DIR}/environment/{ENV}/deploy.{ENV}.json", "r") as f:
    config = json.load(f)

apps_config = config.get("apps", {})
apps_to_deploy = {k: v for k, v in apps_config.items() if k in VALID_APPS and (not APP_FILTER or k == APP_FILTER)}


def run(cmd, cwd=None):
    print(f"> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        sys.exit(result.returncode)


def s3_client():
    return boto3.client("s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "eu-west-1"),
    )


def clear_bucket(bucket):
    s3 = s3_client()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        if "Contents" not in page:
            continue
        s3.delete_objects(Bucket=bucket, Delete={"Objects": [{"Key": obj["Key"]} for obj in page["Contents"]]})


def upload_dist(dist_dir, bucket):
    if not os.path.exists(dist_dir):
        print(f"Build folder not found: {dist_dir}")
        sys.exit(1)
    s3 = s3_client()
    uploaded = 0
    for root, _, files in os.walk(dist_dir):
        for file in files:
            uploaded += 1
            local_path = os.path.join(root, file)
            s3_key = os.path.relpath(local_path, dist_dir)
            content_type, _ = mimetypes.guess_type(local_path)
            extra_args = {"ContentType": content_type} if content_type else {}
            if s3_key == "index.html" or s3_key.endswith("/index.html"):
                extra_args["CacheControl"] = "no-cache, no-store, must-revalidate"
            else:
                extra_args["CacheControl"] = "public, max-age=31536000, immutable"
            s3.upload_file(local_path, bucket, s3_key, ExtraArgs=extra_args)
    print(f"Uploaded {uploaded} files to S3")


def invalidate_cloudfront(distribution_id):
    client = boto3.client("cloudfront",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )
    client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={"Paths": {"Quantity": 1, "Items": ["/*"]}, "CallerReference": str(time.time())}
    )


print(f"=== Deploying fronts to {ENV.upper()} ===\n")

for app_name, app_config in apps_to_deploy.items():
    bucket = app_config["S3_BUCKET"]
    cloudfront_id = app_config["CLOUDFRONT_DISTRIBUTION_ID"]
    app_dir = f"{CODE_DIR}/{app_name}"
    dist_dir = f"{app_dir}/out"

    print(f"--- [{app_name}] ---")
    run("bun install", cwd=app_dir)
    run("bun run build", cwd=app_dir)
    clear_bucket(bucket)
    upload_dist(dist_dir, bucket)
    invalidate_cloudfront(cloudfront_id)
    print(f"{app_name} deployed.\n")

print("=== Deploy finished ===")
