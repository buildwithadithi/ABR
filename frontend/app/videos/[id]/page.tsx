"use client";

import { useParams, useRouter } from "next/navigation";
import VideoPlayer from "@/app/components/VideoPlayer";

export default function VideoPage() {
    const params = useParams();
    const router = useRouter();

    const videoId = Number(params.id);

    if (!Number.isInteger(videoId) || videoId <= 0) {
        return (
            <main className="video-page">
                <div className="empty-state">
                    <h2>Invalid video</h2>

                    <button
                        className="upload-button"
                        onClick={() =>
                            router.push("/my-videos")
                        }
                    >
                        ← Back to My Videos
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="video-page">

            {/* =========================
                HEADER
            ========================= */}

            <header className="video-page-header">

                <button
                    className="back-button"
                    onClick={() =>
                        router.push("/")
                    }
                >
                    ← My Videos
                </button>

                <h1>Video Player</h1>

            </header>


            {/* =========================
                PLAYER
            ========================= */}

            <section className="video-player-section">

                <VideoPlayer
                    videoId={videoId}
                />

            </section>

        </main>
    );
}