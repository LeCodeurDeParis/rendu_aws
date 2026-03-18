import os
import sys
import json
import zipfile
import subprocess
import boto3
from dotenv import load_dotenv

if len(sys.argv) < 2:
    print("Usage: python deploy.crons.py <env>")
    print("  env: staging | prod")
    sys.exit(1)

ENV = sys.argv[1]
if ENV not in ["staging", "prod"]:
    print(f"Invalid environment: {ENV}")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
CRONS_DIR = f"{ROOT_DIR}/code/crons"
DIST_DIR = f"{CRONS_DIR}/dist"
ZIP_PATH = f"{CRONS_DIR}/lambda.zip"

load_dotenv(f"{ROOT_DIR}/.env")

with open(f"{ROOT_DIR}/environment/{ENV}/deploy.{ENV}.json", "r") as f:
    config = json.load(f)

LAMBDA_NAME = config.get("lambda_cron", os.getenv("LAMBDA_CRON_NAME", f"trellu-cron-{ENV}"))


def run(cmd, cwd=None):
    print(f"> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        sys.exit(result.returncode)


def create_zip():
    print("Creating deployment zip...")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(DIST_DIR):
            for file in files:
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, DIST_DIR)
                zf.write(filepath, arcname)
    size = os.path.getsize(ZIP_PATH)
    print(f"  zip created: {size} bytes")


def deploy_lambda():
    print(f"Deploying to Lambda: {LAMBDA_NAME}")
    client = boto3.client("lambda",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "eu-west-1"),
    )
    with open(ZIP_PATH, "rb") as f:
        client.update_function_code(
            FunctionName=LAMBDA_NAME,
            ZipFile=f.read(),
        )
    print("Lambda updated.")


print(f"=== Deploying Crons to {ENV.upper()} ===\n")

print("[1/4] Installing dependencies")
run("bun install", cwd=CRONS_DIR)

print("\n[2/4] Building")
run("bun run build", cwd=CRONS_DIR)

print("\n[3/4] Creating zip")
create_zip()

print("\n[4/4] Deploying to Lambda")
deploy_lambda()

print(f"\n=== Crons deploy to {ENV.upper()} finished ===")
