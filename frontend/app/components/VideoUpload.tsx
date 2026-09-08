"use client";

import { useState } from "react";

const API_URL = "http://localhost:8000";

interface VideoUploadProps {
  onUploadComplete: () => void;
}

interface MultipartPart {
  PartNumber: number;
  ETag: string;
}

const PART_SIZE = 10 * 1024 * 1024; // 10 MB
const CONCURRENCY = 4;

export default function VideoUpload({
  onUploadComplete,
}: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Please select a video first.");
      return;
    }

    const selectedFile = file;

    let currentUploadId: string | null = null;
    let currentStorageKey: string | null = null;

    try {
      setUploading(true);
      setMessage("Starting multipart upload...");

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("User is not authenticated");
      }

      // --------------------------------------------------
      // 1. Initialize multipart upload
      // --------------------------------------------------

      const initResponse = await fetch(
        `${API_URL}/videos/multipart/init`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: selectedFile.name,
            content_type: selectedFile.type,
          }),
        }
      );

      if (!initResponse.ok) {
        throw new Error("Failed to initialize multipart upload");
      }

      const initData = await initResponse.json();

      currentUploadId = initData.upload_id;
      currentStorageKey = initData.storage_key;

      if (!currentUploadId || !currentStorageKey) {
        throw new Error(
          "Multipart upload initialization did not return valid IDs"
        );
      }

      const uploadId = currentUploadId;
      const storageKey = currentStorageKey;

      console.log("Multipart upload initialized");
      console.log("Upload ID:", uploadId);
      console.log("Storage key:", storageKey);

      // --------------------------------------------------
      // 2. Calculate parts
      // --------------------------------------------------

      const totalParts = Math.ceil(
        selectedFile.size / PART_SIZE
      );

      console.log("File size:", selectedFile.size);
      console.log("Part size:", PART_SIZE);
      console.log("Total parts:", totalParts);

      // --------------------------------------------------
      // 3. Get presigned URLs
      // --------------------------------------------------

      setMessage(`Preparing ${totalParts} upload parts...`);

      const partUrls: {
        partNumber: number;
        uploadUrl: string;
      }[] = [];

      for (
        let partNumber = 1;
        partNumber <= totalParts;
        partNumber++
      ) {
        const params = new URLSearchParams({
          storage_key: storageKey,
          upload_id: uploadId,
          part_number: partNumber.toString(),
        });

        const response = await fetch(
          `${API_URL}/videos/multipart/part-url?${params}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to get URL for part ${partNumber}`
          );
        }

        const data = await response.json();

        partUrls.push({
          partNumber: data.part_number,
          uploadUrl: data.upload_url,
        });
      }

      // --------------------------------------------------
      // 4. Upload parts in parallel
      // --------------------------------------------------

      setMessage(`Uploading ${totalParts} parts...`);

      const uploadStartTime = performance.now();

      const uploadedParts: MultipartPart[] = [];

      let nextPartIndex = 0;

      async function uploadNextPart(): Promise<void> {
        const currentIndex = nextPartIndex;
        nextPartIndex++;

        if (currentIndex >= partUrls.length) {
          return;
        }

        const part = partUrls[currentIndex];

        const start =
          (part.partNumber - 1) * PART_SIZE;

        const end = Math.min(
          start + PART_SIZE,
          selectedFile.size
        );

        const chunk = selectedFile.slice(start, end);

        const response = await fetch(
          part.uploadUrl,
          {
            method: "PUT",
            body: chunk,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to upload part ${part.partNumber}`
          );
        }

        const etag = response.headers.get("ETag");

        if (!etag) {
          throw new Error(
            `Missing ETag for part ${part.partNumber}`
          );
        }

        uploadedParts.push({
          PartNumber: part.partNumber,
          ETag: etag.replaceAll('"', ""),
        });

        console.log(
          `Part ${part.partNumber}/${totalParts} uploaded`
        );

        await uploadNextPart();
      }

      const workers = Array.from(
        {
          length: Math.min(
            CONCURRENCY,
            totalParts
          ),
        },
        () => uploadNextPart()
      );

      await Promise.all(workers);

      const uploadEndTime = performance.now();

      const uploadTimeSeconds =
        (uploadEndTime - uploadStartTime) / 1000;

      const uploadSizeMB =
        selectedFile.size / (1024 * 1024);

      const uploadSpeedMBps =
        uploadSizeMB / uploadTimeSeconds;

      console.log(
        "========== MULTIPART UPLOAD BENCHMARK =========="
      );
      console.log(
        `File size: ${uploadSizeMB.toFixed(2)} MB`
      );
      console.log(
        `Part size: ${
          PART_SIZE / (1024 * 1024)
        } MB`
      );
      console.log(`Concurrency: ${CONCURRENCY}`);
      console.log(`Total parts: ${totalParts}`);
      console.log(
        `Upload time: ${uploadTimeSeconds.toFixed(
          2
        )} seconds`
      );
      console.log(
        `Upload speed: ${uploadSpeedMBps.toFixed(
          2
        )} MB/s`
      );
      console.log(
        "==============================================="
      );

      // --------------------------------------------------
      // 5. Sort parts
      // --------------------------------------------------

      uploadedParts.sort(
        (a, b) =>
          a.PartNumber - b.PartNumber
      );

      // --------------------------------------------------
      // 6. Complete multipart upload
      // --------------------------------------------------

      setMessage("Completing multipart upload...");

      const completeResponse = await fetch(
        `${API_URL}/videos/multipart/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            storage_key: storageKey,
            upload_id: uploadId,
            parts: uploadedParts,
            title: selectedFile.name,
            original_filename: selectedFile.name,
          }),
        }
      );

      if (!completeResponse.ok) {
        throw new Error(
          "Failed to complete multipart upload"
        );
      }

      // --------------------------------------------------
      // 7. Success
      // --------------------------------------------------

      setMessage("Video uploaded successfully!");
      setFile(null);
      onUploadComplete();

    } catch (error) {
      console.error(
        "Multipart upload failed:",
        error
      );

      // --------------------------------------------------
      // Abort incomplete upload
      // --------------------------------------------------

      if (currentUploadId && currentStorageKey) {
        try {
          const token =
            localStorage.getItem("access_token");

          const params = new URLSearchParams({
            storage_key: currentStorageKey,
            upload_id: currentUploadId,
          });

          await fetch(
            `${API_URL}/videos/multipart/abort?${params}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("Multipart upload aborted");
        } catch (abortError) {
          console.error(
            "Failed to abort multipart upload:",
            abortError
          );
        }
      }

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
          setFile(
            event.target.files?.[0] ?? null
          );
        }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading
          ? "Uploading..."
          : "Upload Video"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}