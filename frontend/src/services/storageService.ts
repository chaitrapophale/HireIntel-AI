import { auth } from "@/lib/firebase";
import { firestoreService } from "./firestoreService";

export const ALLOWED_FILE_TYPES = [
  "application/pdf", 
  "application/msword", 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const storageService = {
  validateFile(file: File) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type. Only PDF, DOCX, and TXT are allowed.`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
    }
  },

  /**
   * Uploads a file through the FastAPI proxy to bypass Firebase Storage CORS
   * @param file The file to upload
   * @param folder The target folder (e.g., 'resumes' or 'jobs')
   * @param onProgress Callback to track upload progress (0 to 100)
   */
  async uploadFile(
    file: File, 
    folder: "resumes" | "jobs", 
    onProgress?: (progress: number) => void
  ): Promise<{ downloadUrl: string; fileDocId: string; path: string }> {
    this.validateFile(file);

    const user = auth.currentUser;
    if (!user) throw new Error("Unauthenticated user cannot upload files.");

    const idToken = await user.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${apiUrl}/candidates/upload_proxy`);
      
      // We pass the Bearer token for the FastAPI endpoint if it required it, 
      // but we actually just pass it in FormData to be used by the proxy.
      // We still pass it in headers just in case our FastAPI router uses Depends(get_current_user)
      xhr.setRequestHeader("Authorization", `Bearer ${idToken}`);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            onProgress(Math.round(percent));
          }
        };
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const downloadUrl = data.downloadUrl;
            const storagePath = data.path;

            // Save metadata to Firestore
            const fileDoc = await firestoreService.create("files", {
              name: file.name,
              path: storagePath,
              url: downloadUrl,
              size: file.size,
              type: file.type,
              folder
            });

            resolve({
              downloadUrl,
              fileDocId: fileDoc.id,
              path: storagePath
            });
          } catch (err) {
            reject(new Error("Failed to parse response from upload proxy"));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText} - ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("id_token", idToken);

      xhr.send(formData);
    });
  }
};
