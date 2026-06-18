import os
import json
import uuid
import base64
import boto3

def handler(event: dict, context) -> dict:
    """Загрузка фотографии нарушения в S3. Принимает base64, возвращает CDN URL."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "Method not allowed"})}

    body = json.loads(event.get("body") or "{}")
    data_url = body.get("dataUrl", "")

    if not data_url:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "dataUrl is required"})}

    # Парсим data URL: "data:image/jpeg;base64,/9j/..."
    if "," not in data_url:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Invalid dataUrl format"})}

    header, encoded = data_url.split(",", 1)
    content_type = "image/jpeg"
    if "image/png" in header:
        content_type = "image/png"
    elif "image/webp" in header:
        content_type = "image/webp"
    elif "image/gif" in header:
        content_type = "image/gif"

    ext = content_type.split("/")[1]
    image_data = base64.b64decode(encoded)

    file_key = f"prescription-photos/{uuid.uuid4()}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

    s3.put_object(
        Bucket="files",
        Key=file_key,
        Body=image_data,
        ContentType=content_type,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"

    return {
        "statusCode": 200,
        "headers": {**cors, "Content-Type": "application/json"},
        "body": json.dumps({"url": cdn_url}),
    }
