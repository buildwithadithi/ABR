"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VideoUpload from "@/app/components/VideoUpload";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface Video {
    id: number;
    title: string;
    original_filename: string;
    status: string;
    created_at: string;
}

export default function MyVideos() {
    const router = useRouter();

    const [videos, setVideos] = useState<Video[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [showUpload, setShowUpload] = useState(false);

    const [videoToDelete, setVideoToDelete] =
        useState<Video | null>(null);

    const [deleting, setDeleting] = useState(false);

    /*
     * Load all videos belonging to
     * the currently authenticated user.
     */
    const loadVideos = useCallback(async () => {
        try {
            const token =
                localStorage.getItem("access_token");

            if (!token) {
                throw new Error(
                    "User is not authenticated",
                );
            }

            const response = await fetch(
                `${API_URL}/videos/`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to fetch videos",
                );
            }

            const data = await response.json();

            setVideos(data);
            setError("");
        } catch (error) {
            console.error(error);

            setError(
                "Failed to load videos.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    /*
     * Open delete confirmation dialog.
     */
    function handleDelete(video: Video) {
        setVideoToDelete(video);
    }

    /*
     * Actually delete the video after
     * user confirms.
     */
    async function confirmDelete() {
        if (!videoToDelete) {
            return;
        }

        try {
            setDeleting(true);

            const token =
                localStorage.getItem(
                    "access_token",
                );

            if (!token) {
                throw new Error(
                    "User is not authenticated",
                );
            }

            const response = await fetch(
                `${API_URL}/videos/${videoToDelete.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to delete video",
                );
            }

            /*
             * Close delete dialog.
             */
            setVideoToDelete(null);

            /*
             * Refresh video list.
             */
            await loadVideos();
        } catch (error) {
            console.error(error);
        } finally {
            setDeleting(false);
        }
    }

    /*
     * Initial video loading.
     */
    useEffect(() => {
        loadVideos();
    }, [loadVideos]);

    /*
     * Poll every 5 seconds while at least
     * one video is waiting or processing.
     */
    useEffect(() => {
        const hasProcessingVideo =
            videos.some(
                (video) =>
                    video.status === "uploaded" ||
                    video.status === "processing",
            );

        if (!hasProcessingVideo) {
            return;
        }

        const interval = setInterval(() => {
            loadVideos();
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [videos, loadVideos]);

    /*
     * Loading state.
     */
    if (loading) {
        return (
            <main>
                <p>Loading videos...</p>
            </main>
        );
    }

    /*
     * Error state.
     */
    if (error) {
        return (
            <main>
                <div className="empty-state">
                    <h2>{error}</h2>

                    <button
                        className="upload-button"
                        onClick={loadVideos}
                    >
                        Retry
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main>

            {/* =========================
                HEADER
            ========================= */}

            <header className="page-header">

                <div>
                    <h1>My Videos</h1>

                    <p>
                        {videos.length}{" "}
                        {videos.length === 1
                            ? "video"
                            : "videos"}
                    </p>
                </div>

                <button
                    className="upload-button"
                    onClick={() =>
                        setShowUpload(true)
                    }
                >
                    + Upload Video
                </button>

            </header>


            {/* =========================
                VIDEO LIST
            ========================= */}

            {videos.length === 0 ? (

                /*
                 * Empty state
                 */
                <div className="empty-state">

                    <div className="empty-state-icon">
                        🎬
                    </div>

                    <h2>
                        No videos yet
                    </h2>

                    <p>
                        Upload your first video
                        and it will appear here
                        once processing is complete.
                    </p>

                    <button
                        className="upload-button"
                        onClick={() =>
                            setShowUpload(true)
                        }
                    >
                        Upload Your First Video
                    </button>

                </div>

            ) : (

                /*
                 * Video cards
                 */
                <div className="video-grid">

                    {videos.map((video) => (

                        <div
                            key={video.id}
                            className="video-card"
                        >

                            {/* =====================
                                THUMBNAIL
                            ===================== */}

                            <div className="video-thumbnail">
                                ▶
                            </div>


                            {/* =====================
                                VIDEO INFORMATION
                            ===================== */}

                            <div className="video-info">

                                <h2>
                                    {video.title}
                                </h2>

                                <p className="video-filename">
                                    {video.original_filename}
                                </p>


                                {/* =====================
                                    STATUS
                                ===================== */}

                                {video.status ===
                                    "completed" && (
                                    <span className="status status-ready">
                                        Ready
                                    </span>
                                )}

                                {video.status ===
                                    "processing" && (
                                    <span className="status status-processing">
                                        Processing...
                                    </span>
                                )}

                                {video.status ===
                                    "uploaded" && (
                                    <span className="status status-waiting">
                                        Waiting...
                                    </span>
                                )}

                                {video.status ===
                                    "failed" && (
                                    <span className="status status-failed">
                                        Failed
                                    </span>
                                )}


                                {/* =====================
                                    STATUS MESSAGE
                                ===================== */}

                                {video.status ===
                                    "processing" && (
                                    <p>
                                        Your video is
                                        being converted
                                        to HLS.
                                    </p>
                                )}

                                {video.status ===
                                    "uploaded" && (
                                    <p>
                                        Waiting for the
                                        processing worker.
                                    </p>
                                )}

                                {video.status ===
                                    "failed" && (
                                    <p>
                                        Video processing
                                        failed.
                                    </p>
                                )}


                                {/* =====================
                                    ACTIONS
                                ===================== */}

                                <div className="video-actions">

                                    {video.status ===
                                        "completed" && (
                                        <button
                                            className="play-button"
                                            onClick={() =>
                                                router.push(
                                                    `/videos/${video.id}`,
                                                )
                                            }
                                        >
                                            ▶ Play
                                        </button>
                                    )}

                                    <button
                                        className="delete-button"
                                        onClick={() =>
                                            handleDelete(
                                                video,
                                            )
                                        }
                                    >
                                        Delete
                                    </button>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>
            )}


            {/* =========================
                UPLOAD MODAL
            ========================= */}

            {showUpload && (

                <div
                    className="upload-overlay"
                    onClick={() =>
                        setShowUpload(false)
                    }
                >

                    <div
                        className="upload-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* Modal header */}

                        <div className="upload-modal-header">

                            <div>
                                <h2>
                                    Upload Video
                                </h2>

                                <p>
                                    Upload a video
                                    to your library.
                                </p>
                            </div>

                            <button
                                className="close-button"
                                onClick={() =>
                                    setShowUpload(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        {/* Existing upload component */}

                        <VideoUpload
                            onUploadComplete={() => {
                                setShowUpload(false);

                                loadVideos();
                            }}
                        />

                    </div>

                </div>
            )}


            {/* =========================
                DELETE CONFIRMATION MODAL
            ========================= */}

            {videoToDelete && (

                <div
                    className="upload-overlay"
                    onClick={() => {
                        if (!deleting) {
                            setVideoToDelete(null);
                        }
                    }}
                >

                    <div
                        className="delete-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* Delete icon */}

                        <div className="delete-icon">
                            🗑
                        </div>


                        {/* Content */}

                        <h2>
                            Delete video?
                        </h2>

                        <p>
                            Are you sure you want
                            to delete{" "}
                            <strong>
                                "{videoToDelete.title}"
                            </strong>
                            ?
                        </p>

                        <p className="delete-warning">
                            This action cannot be undone.
                        </p>


                        {/* Buttons */}

                        <div className="delete-actions">

                            <button
                                className="cancel-delete-button"
                                disabled={deleting}
                                onClick={() =>
                                    setVideoToDelete(
                                        null,
                                    )
                                }
                            >
                                Cancel
                            </button>

                            <button
                                className="confirm-delete-button"
                                disabled={deleting}
                                onClick={
                                    confirmDelete
                                }
                            >
                                {deleting
                                    ? "Deleting..."
                                    : "Delete Video"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </main>
    );
}