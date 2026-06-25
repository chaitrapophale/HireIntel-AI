import requests
import sys

def upload_to_firebase_storage_rest(bucket_name, object_path, file_bytes, mime_type, id_token):
    # Firebase Storage REST API endpoint for uploading
    url = f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o?name={object_path}"
    
    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": mime_type
    }
    
    response = requests.post(url, headers=headers, data=file_bytes)
    return response.json(), response.status_code

if __name__ == "__main__":
    print("REST API proxy method ready.")
