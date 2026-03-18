import os
import sys
import json
import boto3
import mimetypes
from dotenv import load_dotenv

if len(sys.argv) < 2:
    print("Usage: python deploy.assets.py <env>")
    print("  env: staging | prod")
    sys.exit(1)

ENV = sys.argv[1]
if ENV not in ["staging", "prod"]:
    print(f"Invalid environment: {ENV}")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
ASSETS_DIR = f"{ROOT_DIR}/code/assets"

load_dotenv(f"{ROOT_DIR}/.env")

with open(f"{ROOT_DIR}/environment/{ENV}/deploy.{ENV}.json", "r") as f:
    config = json.load(f)

BUCKET = config.get("assets", {}).get("S3_BUCKET", config.get("apps", {}).get("assets", {}).get("S3_BUCKET"))
if not BUCKET:
    print("No assets bucket configured in deploy config")
    sys.exit(1)


def s3_client():
    return boto3.client("s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "eu-west-1"),
    )


def upload_assets():
    if not os.path.exists(ASSETS_DIR):
        print(f"Assets folder not found: {ASSETS_DIR}")
        sys.exit(1)

    s3 = s3_client()
    uploaded = 0
    for root, _, files in os.walk(ASSETS_DIR):
        for file in files:
            uploaded += 1
            local_path = os.path.join(root, file)
            s3_key = os.path.relpath(local_path, ASSETS_DIR)
            content_type, _ = mimetypes.guess_type(local_path)
            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type
            extra_args["CacheControl"] = "public, max-age=31536000, immutable"
            s3.upload_file(local_path, BUCKET, s3_key, ExtraArgs=extra_args)
    print(f"Uploaded {uploaded} assets to S3")


print(f"=== Deploying assets to {ENV.upper()} ===")
upload_assets()
print("=== Deploy finished ===")
