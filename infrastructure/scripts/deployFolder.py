import os
import sys
import json
import boto3
import mimetypes
from dotenv import load_dotenv

home_repo = os.getcwd()
load_dotenv(f'{home_repo}/environments/dev/.env.dev.deploy')

BUCKET = "b3nbaws-dev-assets"
FOLDER = ["assets"]

folder = sys.argv[1]
if folder not in FOLDER:
    print(f"Folder {folder} not found")
    exit(-1)

#Variables
home_code = f"{home_repo}/code"

with open(f'{home_repo}/environments/dev/deploy.dev.json', 'r') as f:
    deploy_config = json.load(f)

home_assets = f"{home_repo}/environments/{deploy_config['APP_ENV']}"

def upload_to_s3(app_name, folder_path):
    try:
        bucket = BUCKET
        client= boto3.client(
            "s3",
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        )

        for root, dirs, files in os.walk(folder_path):
            for filename in files:
                try:
                    extension = os.path.splitext(filename)[-1]
                    content_type = mimetypes.types_map[extension]
                except:
                    content_type = "text/plain"

                local_path = os.path.join(root, filename)
                relative_path = os.path.relpath(local_path, folder_path)
                client.upload_file(
                    local_path,
                    bucket,
                    relative_path,
                    ExtraArgs={'ContentType': content_type, 'ACL': 'public-read'},
                )
        print(f"Uploaded {folder_path} to {bucket}")

    except Exception as e:
        print(f"Error uploading to S3: {e}")
        exit(-1)

#Process
upload_to_s3(f"{deploy_config['APP_NAME']}-{deploy_config['APP_ENV']}", f'{home_code}/{folder}')

