"use client";

import { useState } from "react";

const API_URL = "http://localhost:8000";

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Please select a video first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("Getting upload URL...");

      // 1. Ask FastAPI for a presigned URL
      const token = localStorage.getItem("access_token");

      const params = new URLSearchParams({
        filename: file.name,
        content_type: file.type,
      });

      const response = await fetch(
        `${API_URL}/videos/upload-url?${params}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();

      // 2. Upload video directly to S3
      setMessage("Uploading video to S3...");

      const uploadResponse = await fetch(data.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("S3 upload failed");
      }

      // 3. Tell FastAPI that the upload completed
      setMessage("Finalizing upload...");

      const completeResponse = await fetch(
        `${API_URL}/videos/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: file.name,
            original_filename: file.name,
            storage_key: data.storage_key,
          }),
        }
      );

      if (!completeResponse.ok) {
        throw new Error("Failed to finalize upload");
      }

      setMessage("Video uploaded successfully!");
      setFile(null);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="video/*"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
        }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? "Uploading..." : "Upload Video"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}