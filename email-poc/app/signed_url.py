from google.auth import impersonated_credentials
import google.auth
from google.cloud import storage
import datetime


def generate_signed_url(bucket_name, blob_name, ttl_minutes=15):
    # Create impersonated credentials
    target_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    source_credentials, _ = google.auth.default()
    target_credentials = impersonated_credentials.Credentials(
        source_credentials=source_credentials,
        target_principal="xxxxxxxxxxxx-compute@developer.gserviceaccount.com",
        target_scopes=target_scopes,
        lifetime=3600,  # 1 hour
    )

    # Create a storage client with the impersonated credentials
    storage_client = storage.Client(credentials=target_credentials)

    # Get the bucket and blob
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # Generate the signed URL
    url = blob.generate_signed_url(
        expiration=datetime.timedelta(minutes=ttl_minutes), method="GET", version="v4"
    )
    return url
