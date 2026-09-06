import boto3
from botocore.config import Config

from app.config import settings


class S3Service:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            config=Config(
                signature_version="s3v4",
                s3={
                    "addressing_style": "virtual"
                },
            ),
        )

        self.bucket = settings.AWS_S3_BUCKET

    def generate_upload_url(
        self,
        storage_key: str,
        content_type: str,
        expires_in: int = 900,
    ) -> str:
        return self.client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.bucket,
                "Key": storage_key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
        
    def object_exists(self, storage_key: str) -> bool:
        try:
            self.client.head_object(
                Bucket=self.bucket,
                Key=storage_key,
            )
            return True
        except self.client.exceptions.ClientError as error:
            if error.response["Error"]["Code"] in ("404", "NoSuchKey"):
                return False
            raise