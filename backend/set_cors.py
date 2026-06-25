import os
import json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, storage

load_dotenv()

# Ensure we have the bucket name
bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
if not bucket_name:
    # If not set, we can derive it from the project ID
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    if project_id:
        bucket_name = f"{project_id}.firebasestorage.app"
    else:
        # Fallback to the default typical URL structure
        print("Please set FIREBASE_STORAGE_BUCKET or FIREBASE_PROJECT_ID in .env")
        exit(1)

# Initialize Firebase Admin using the service account credentials in the environment
try:
    cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json"))
    firebase_admin.initialize_app(cred, {
        'storageBucket': bucket_name
    })
    print(f"Initialized with bucket: {bucket_name}")
except Exception as e:
    # If already initialized or other error
    if "already exists" not in str(e):
        print(f"Initialization error: {e}")
        exit(1)

bucket = storage.bucket()

# Configure CORS
cors_configuration = [
    {
        "origin": ["*"],  # Or specify the exact origins like ["http://localhost:5173"]
        "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
        "responseHeader": ["*"],
        "maxAgeSeconds": 3600
    }
]

try:
    bucket.cors = cors_configuration
    bucket.patch()
    print("CORS configured successfully!")
    print("New CORS configuration:")
    print(json.dumps(bucket.cors, indent=2))
except Exception as e:
    print(f"Failed to update CORS: {e}")
