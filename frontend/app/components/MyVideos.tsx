"use client";

import { useCallback, useEffect, useState } from "react";
import VideoPlayer from "@/app/components/VideoPlayer";
import VideoUpload from "@/app/components/VideoUpload";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL!;

interface Video {
    id: number;
    title: string;
    original_filename: string;
    status: string;
    created_at: string;
}

export default function MyVideos() {
    const [videos, setVideos] =
        useState<Video[]>([]);

    const [selectedVideoId, setSelectedVideoId] =
        useState<number | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const loadVideos = useCallback(async () => {
        try {
            const token =
                localStorage.getItem(
                    "access_token",
                );

            if (!token) {
                throw new Error(
                    "User is not authenticated",
                );
            }

            const response =
                await fetch(
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

            const data =
                await response.json();

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
    async function handleDelete(videoId: number) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this video?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const token =
                localStorage.getItem("access_token");

            const response = await fetch(
                `${API_URL}/videos/${videoId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to delete video"
                );
            }

            // Close player if the deleted video
            // is currently selected.
            if (selectedVideoId === videoId) {
                setSelectedVideoId(null);
            }

            // Refresh video list
            await loadVideos();

        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        loadVideos();
    }, [loadVideos]);

    /*
     * Poll while at least one video is processing.
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

        const interval =
            setInterval(() => {
                loadVideos();
            }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [videos, loadVideos]);

    if (loading) {
        return <p>Loading videos...</p>;
    }

    if (error) {
        return (
            <div>
                <p>{error}</p>

                <button
                    onClick={loadVideos}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            <h1>My Videos</h1>

            <VideoUpload
                onUploadComplete={loadVideos}
            />

            <hr />

            {videos.length === 0 ? (
                <p>
                    You haven't uploaded any videos yet.
                </p>
            ) : (
                <div>
                    {videos.map((video) => (
                        <div
                            key={video.id}
                            style={{
                                marginBottom: "20px",
                            }}
                        >
                            <h2>
                                {video.title}
                            </h2>

                            <p>
                                File:{" "}
                                {video.original_filename}
                            </p>

                            <p>
                                Status:{" "}
                                {video.status}
                            </p>

                            {video.status ===
                                "uploaded" && (
                                    <p>
                                        Waiting for processing...
                                    </p>
                                )}

                            {video.status ===
                                "processing" && (
                                    <p>
                                        Processing video...
                                    </p>
                                )}

                            {video.status === "completed" && (
                                <>
                                    <button
                                        onClick={() =>
                                            setSelectedVideoId(video.id)
                                        }
                                    >
                                        Play
                                    </button>

                                </>
                            )}
                            <button
                                onClick={() =>
                                    handleDelete(video.id)
                                }
                            >
                                Delete
                            </button>

                            {video.status ===
                                "failed" && (
                                    <p>
                                        Processing failed.
                                    </p>
                                )}
                        </div>
                    ))}
                </div>
            )}

            {selectedVideoId !== null && (
                <div>
                    <hr />

                    <VideoPlayer
                        videoId={
                            selectedVideoId
                        }
                    />
                </div>
            )}
        </div>
    );
}