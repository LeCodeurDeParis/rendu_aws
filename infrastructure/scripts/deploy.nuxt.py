import os
import time
import json
import boto3
import subprocess
import mimetypes
from dotenv import load_dotenv

#Variables


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))

ENV_DIR = f"{ROOT_DIR}/environment/dev"
ENV_FILE = f"{ENV_DIR}/.env.dev.deploy"
DEPLOY_CONFIG_FILE = f"{ENV_DIR}/deploy.dev.json"

CODE_DIR = f"{ROOT_DIR}/code"
NUXT_DIR = f"{CODE_DIR}/nuxt"
DIST_DIR = f"{NUXT_DIR}/.output/public"

load_dotenv(ENV_FILE)

with open(DEPLOY_CONFIG_FILE, "r") as f:
    config = json.load(f)

BUCKET = config["S3_BUCKET"]

def run(cmd, cwd=None):
    print(f"> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        exit(result.returncode)

def build_nuxt():
    run("pnpm install", cwd=NUXT_DIR)
    run("pnpm run generate", cwd=NUXT_DIR)

def s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_DEFAULT_REGION"),
    )

def clear_bucket():
    print("clearing s3")
    s3 = s3_client()
    paginator = s3.get_paginator("list_objects_v2")

    for page in paginator.paginate(Bucket=BUCKET):
        if "Contents" not in page:
            continue
        s3.delete_objects(
            Bucket=BUCKET,
            Delete={"Objects": [{"Key": obj["Key"]} for obj in page["Contents"]]}
        )

def upload_dist():
    print(f"Uploading Nuxt from {DIST_DIR}")

    if not os.path.exists(DIST_DIR):
        print("Build folder not found")
        exit(1)

    s3 = s3_client()
    uploaded = 0


    for root, _, files in os.walk(DIST_DIR):
        for file in files:
            uploaded += 1
            local_path = os.path.join(root, file)
            s3_key = os.path.relpath(local_path, DIST_DIR)

            content_type, _ = mimetypes.guess_type(local_path)
            extra_args = {}

            if content_type:
                extra_args["ContentType"] = content_type

            if s3_key == "index.html":
                extra_args["CacheControl"] = "no-cache, no-store, must-revalidate"
            else:
                extra_args["CacheControl"] = "public, max-age=31536000, immutable"

            s3.upload_file(
                local_path,
                BUCKET,
                s3_key,
                ExtraArgs=extra_args
            )
        print(f"Uploaded {uploaded} files to S3")

def invalidate_cloudfront():
    print("Invalidating CloudFront cache")

    client = boto3.client(
        "cloudfront",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )

    client.create_invalidation(
        DistributionId=os.getenv("CLOUDFRONT_DISTRIBUTION_ID"),
        InvalidationBatch={
            "Paths": {
                "Quantity": 1,
                "Items": ["/*"]
            },
            "CallerReference": str(time.time())
        }
    )


print("Build Nuxt")
build_nuxt()

print("Clean S3")
clear_bucket()

print("Upload")
upload_dist()
invalidate_cloudfront()

print("deploy finished")