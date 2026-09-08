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

    # --------------------------------------------------
    # Single PUT upload
    # --------------------------------------------------

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

    # --------------------------------------------------
    # Multipart upload
    # --------------------------------------------------

    def create_multipart_upload(
        self,
        storage_key: str,
        content_type: str,
    ) -> str:
        response = self.client.create_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            ContentType=content_type,
        )

        return response["UploadId"]

    def generate_part_upload_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: int = 900,
    ) -> str:
        return self.client.generate_presigned_url(
            ClientMethod="upload_part",
            Params={
                "Bucket": self.bucket,
                "Key": storage_key,
                "UploadId": upload_id,
                "PartNumber": part_number,
            },
            ExpiresIn=expires_in,
        )

    def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict],
    ) -> None:
        self.client.complete_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            UploadId=upload_id,
            MultipartUpload={
                "Parts": parts,
            },
        )

    def abort_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
    ) -> None:
        self.client.abort_multipart_upload(
            Bucket=self.bucket,
            Key=storage_key,
            UploadId=upload_id,
        )

    # --------------------------------------------------
    # Check object
    # --------------------------------------------------

    def object_exists(
        self,
        storage_key: str,
    ) -> bool:
        try:
            self.client.head_object(
                Bucket=self.bucket,
                Key=storage_key,
            )

            return True

        except self.client.exceptions.ClientError as error:
            if error.response["Error"]["Code"] in (
                "404",
                "NoSuchKey",
            ):
                return False

            raise

    # --------------------------------------------------
    # Download
    # --------------------------------------------------

    def download_object(
        self,
        storage_key: str,
        destination_path: str,
    ) -> None:
        self.client.download_file(
            self.bucket,
            storage_key,
            destination_path,
        )

    # --------------------------------------------------
    # Upload generated HLS files
    # --------------------------------------------------

    def upload_file(
        self,
        local_path: str,
        storage_key: str,
        content_type: str,
    ) -> None:
        self.client.upload_file(
            local_path,
            self.bucket,
            storage_key,
            ExtraArgs={
                "ContentType": content_type,
            },
        )

    # --------------------------------------------------
    # Delete single object
    # --------------------------------------------------

    def delete_object(
        self,
        storage_key: str,
    ) -> None:
        self.client.delete_object(
            Bucket=self.bucket,
            Key=storage_key,
        )

    # --------------------------------------------------
    # Delete all objects under prefix
    # --------------------------------------------------

    def delete_prefix(
        self,
        prefix: str,
    ) -> None:
        response = self.client.list_objects_v2(
            Bucket=self.bucket,
            Prefix=prefix,
        )

        objects = response.get(
            "Contents",
            [],
        )

        if not objects:
            return

        self.client.delete_objects(
            Bucket=self.bucket,
            Delete={
                "Objects": [
                    {
                        "Key": obj["Key"]
                    }
                    for obj in objects
                ]
            },
        )