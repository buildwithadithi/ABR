"use client";

import Hls from "hls.js";
import {
    useEffect,
    useRef,
    useState,
} from "react";

import { ABRController } from "@/app/abr/abrController";

import {
    BufferState,
} from "@/app/abr/bufferController";

import { getFragmentMetrics } from "@/app/hls/fragmentMetrics";
import { getBufferMetrics } from "@/app/hls/bufferMetrics";

import ABRTimeline, {
    ABRTimelineEntry,
} from "@/app/components/ABRTimeline";


const API_URL =
    process.env.NEXT_PUBLIC_API_URL!;

const CLOUDFRONT_URL =
    process.env.NEXT_PUBLIC_CLOUDFRONT_URL!;

const MAX_TIMELINE_ENTRIES = 20;


// ==================================================
// VIDEO PLAYER
// ==================================================

interface VideoPlayerProps {
    videoId: number;
}


export default function VideoPlayer({
    videoId,
}: VideoPlayerProps) {

    // -----------------------------------------------
    // VIDEO
    // -----------------------------------------------

    const videoRef =
        useRef<HTMLVideoElement | null>(null);


    // -----------------------------------------------
    // ABR CONTROLLER
    // -----------------------------------------------

    const abrControllerRef =
        useRef(new ABRController());


    // -----------------------------------------------
    // BUFFER STATE
    // -----------------------------------------------

    const [bufferSeconds, setBufferSeconds] =
        useState(0);

    const [bufferState, setBufferState] =
        useState<BufferState>("CRITICAL");


    // -----------------------------------------------
    // BUFFER REFS
    // -----------------------------------------------

    const bufferSecondsRef =
        useRef(0);

    const bufferStateRef =
        useRef<BufferState>("CRITICAL");


    // -----------------------------------------------
    // ABR TIMELINE
    // -----------------------------------------------

    const [timeline, setTimeline] =
        useState<ABRTimelineEntry[]>([]);


    // -----------------------------------------------
    // PLAYBACK START
    // -----------------------------------------------

    const playbackStartRef =
        useRef<number | null>(null);


    // ==================================================
    // MAIN EFFECT
    // ==================================================

    useEffect(() => {

        // ------------------------------------------
        // Cancellation flag
        // ------------------------------------------

        let cancelled = false;


        // ------------------------------------------
        // Get video element
        // ------------------------------------------

        const videoElement =
            videoRef.current;

        if (videoElement === null) {
            return;
        }

        // Playback debugging
        const handleWaiting = () => {
            console.log("PLAYBACK WAITING", {
                currentTime: videoElement.currentTime,
                buffered: Array.from(
                    { length: videoElement.buffered.length },
                    (_, i) => ({
                        start: videoElement.buffered.start(i),
                        end: videoElement.buffered.end(i),
                    })
                ),
            });
        };

        const handlePlaying = () => {
            console.log("PLAYBACK PLAYING", {
                currentTime: videoElement.currentTime,
            });
        };

        const handleEnded = () => {
            console.log("PLAYBACK ENDED");
        };

        const handleStalled = () => {
            console.log("PLAYBACK STALLED", {
                currentTime: videoElement.currentTime,
            });
        };

        videoElement.addEventListener("waiting", handleWaiting);
        videoElement.addEventListener("playing", handlePlaying);
        videoElement.addEventListener("ended", handleEnded);
        videoElement.addEventListener("stalled", handleStalled);


        // ------------------------------------------
        // HLS instance
        // ------------------------------------------

        let hls: Hls | null = null;


        // ------------------------------------------
        // Reset state for this video
        // ------------------------------------------

        setTimeline([]);

        setBufferSeconds(0);

        setBufferState("CRITICAL");

        bufferSecondsRef.current = 0;

        bufferStateRef.current = "CRITICAL";

        playbackStartRef.current = null;


        // ==================================================
        // PLAYBACK START TRACKING
        // ==================================================

        const handlePlay = () => {

            if (
                playbackStartRef.current === null
            ) {

                playbackStartRef.current =
                    performance.now();

                console.log(
                    "PLAYBACK STARTED",
                );
            }
        };


        videoElement.addEventListener(
            "play",
            handlePlay,
        );


        // ==================================================
        // BUFFER MONITOR
        // ==================================================

        const updateBuffer = () => {

            const metrics =
                getBufferMetrics(
                    videoElement,
                );


            bufferSecondsRef.current =
                metrics.bufferSeconds;


            bufferStateRef.current =
                metrics.bufferState;


            setBufferSeconds(
                metrics.bufferSeconds,
            );


            setBufferState(
                metrics.bufferState,
            );
        };


        updateBuffer();


        const bufferInterval =
            setInterval(
                updateBuffer,
                250,
            );


        // ==================================================
        // LOAD VIDEO INFORMATION
        // ==================================================

        async function loadVideo() {

            try {

                // ------------------------------------------
                // Check cancellation
                // ------------------------------------------

                if (cancelled) {
                    return;
                }


                // ------------------------------------------
                // Get video element
                // ------------------------------------------

                const currentVideoElement =
                    videoRef.current;

                if (
                    currentVideoElement === null
                ) {
                    return;
                }


                // ------------------------------------------
                // Get JWT
                // ------------------------------------------

                const token =
                    localStorage.getItem(
                        "access_token",
                    );


                if (!token) {

                    throw new Error(
                        "User is not authenticated",
                    );
                }


                // ==================================================
                // GET VIDEO METADATA
                // ==================================================

                console.log(
                    "Loading video metadata...",
                );


                const response =
                    await fetch(
                        `${API_URL}/videos/${videoId}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );


                if (!response.ok) {

                    throw new Error(
                        "Failed to fetch video",
                    );
                }


                const data =
                    await response.json();


                // ------------------------------------------
                // Check cancellation after fetch
                // ------------------------------------------

                if (cancelled) {
                    return;
                }


                console.log(
                    "Video metadata:",
                    data,
                );


                // ==================================================
                // CHECK PROCESSING STATUS
                // ==================================================

                if (
                    data.status !== "completed" ||
                    !data.processed_storage_key
                ) {

                    throw new Error(
                        "Video is not ready for playback",
                    );
                }


                // ==================================================
                // BUILD CLOUDFRONT URL
                // ==================================================

                const playbackUrl =
                    `${CLOUDFRONT_URL}/${data.processed_storage_key}`;


                console.log(
                    "Playback URL:",
                    playbackUrl,
                );


                // ==================================================
                // HLS.JS
                // ==================================================

                if (Hls.isSupported()) {

                    // ------------------------------------------
                    // Check cancellation
                    // ------------------------------------------

                    if (cancelled) {
                        return;
                    }


                    // ------------------------------------------
                    // Create HLS
                    // ------------------------------------------

                    hls = new Hls({
                        startLevel: 0,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                        backBufferLength: 30,
                    });

                    console.log(
                        "HLS VERSION:",
                        Hls.version,
                    );


                    // ==================================================
                    // MEDIA ATTACHED
                    // ==================================================

                    hls.on(
                        Hls.Events.MEDIA_ATTACHED,
                        () => {

                            if (cancelled) {
                                return;
                            }

                            console.log(
                                "HLS: MEDIA_ATTACHED",
                            );
                        },
                    );


                    // ==================================================
                    // MANIFEST PARSED
                    // ==================================================

                    hls.on(
                        Hls.Events.MANIFEST_PARSED,
                        (_, data) => {

                            if (cancelled) {
                                return;
                            }


                            console.log(
                                "HLS: MANIFEST_PARSED",
                            );


                            console.log(
                                "HLS levels:",
                                hls?.levels.map(
                                    (level, index) => ({
                                        index,
                                        width: level.width,
                                        height: level.height,
                                        bitrate:
                                            level.bitrate,
                                    }),
                                ),
                            );


                            // Explicitly start loading.
                            hls?.startLoad();
                        },
                    );


                    // ==================================================
                    // FRAGMENT LOADING
                    // ==================================================

                    hls.on(
                        Hls.Events.FRAG_LOADING,
                        (_, data) => {

                            if (cancelled) {
                                return;
                            }


                            console.log(
                                "HLS: REQUESTING FRAGMENT",
                            );


                            console.log(
                                "Fragment URL:",
                                data.frag.url,
                            );


                            console.log(
                                "Fragment level:",
                                data.frag.level,
                            );
                        },
                    );


                    // ==================================================
                    // FRAGMENT LOADED
                    // ==================================================

                    const handleFragmentLoaded = (
                        _: unknown,
                        fragmentData: any,
                    ) => {

                        if (
                            cancelled ||
                            !hls
                        ) {
                            return;
                        }


                        // ------------------------------------------
                        // Calculate metrics
                        // ------------------------------------------

                        const metrics =
                            getFragmentMetrics(
                                fragmentData,
                                hls,
                            );


                        if (!metrics) {
                            return;
                        }


                        // ==================================================
                        // BUFFER INFORMATION
                        // ==================================================

                        const currentBufferSeconds =
                            bufferSecondsRef.current;


                        const currentBufferState =
                            bufferStateRef.current;


                        // ==================================================
                        // ABR DECISION
                        // ==================================================

                        const decision =
                            abrControllerRef.current
                                .processFragment(
                                    metrics.bytesLoaded,
                                    metrics.downloadTimeSeconds,
                                    currentBufferSeconds,
                                    metrics.segmentDurationSeconds,
                                    metrics.levelBitratesMbps,
                                );


                        // ==================================================
                        // TELL HLS.JS NEXT QUALITY
                        // ==================================================

                        hls.nextLoadLevel =
                            decision.nextLevel;


                        console.log(
                            "HLS CONTROL:",
                            "nextLoadLevel =",
                            hls.nextLoadLevel,
                            "currentLevel =",
                            hls.currentLevel,
                        );


                        // ==================================================
                        // TIMELINE ENTRY
                        // ==================================================

                        const timestamp =
                            metrics.timestamp;


                        const timelineEntry:
                            ABRTimelineEntry = {

                            timestamp,

                            throughputMbps:
                                decision.throughputMbps,

                            smoothedThroughputMbps:
                                decision.smoothedThroughputMbps,

                            safeThroughputMbps:
                                decision.safeThroughputMbps,

                            currentLevel:
                                decision.currentLevel,

                            idealLevel:
                                decision.idealLevel,

                            nextLevel:
                                decision.nextLevel,

                            decision:
                                decision.decision,

                            startup:
                                decision.startup,
                        };


                        setTimeline(
                            (previous) => {

                                const updated = [
                                    ...previous,
                                    timelineEntry,
                                ];


                                return updated.slice(
                                    -MAX_TIMELINE_ENTRIES,
                                );
                            },
                        );


                        // ==================================================
                        // DEBUG
                        // ==================================================

                        console.log(
                            "━━━━━━━━━━━━━━━━━━━━",
                        );


                        console.log(
                            "Available bitrates:",
                            metrics.levelBitratesMbps,
                        );


                        console.log(
                            "Downloaded level:",
                            fragmentData.frag.level,
                        );


                        console.log(
                            "Throughput:",
                            decision.throughputMbps.toFixed(2),
                            "Mbps",
                        );


                        console.log(
                            "Smoothed:",
                            decision.smoothedThroughputMbps.toFixed(2),
                            "Mbps",
                        );


                        console.log(
                            "Safe:",
                            decision.safeThroughputMbps.toFixed(2),
                            "Mbps",
                        );


                        console.log(
                            "Current:",
                            decision.currentLevel,
                        );


                        console.log(
                            "Ideal:",
                            decision.idealLevel,
                        );


                        console.log(
                            "Next:",
                            decision.nextLevel,
                        );


                        console.log(
                            "Decision:",
                            decision.decision,
                        );


                        console.log(
                            "Startup:",
                            decision.startup,
                        );


                        console.log(
                            "Buffer:",
                            currentBufferSeconds.toFixed(2),
                            "sec",
                        );


                        console.log(
                            "Buffer state:",
                            currentBufferState,
                        );


                        console.log(
                            "Segment duration:",
                            metrics.segmentDurationSeconds.toFixed(2),
                            "sec",
                        );


                        console.log(
                            "━━━━━━━━━━━━━━━━━━━━",
                        );
                    };


                    // ==================================================
                    // ERROR HANDLING
                    // ==================================================

                    hls.on(
                        Hls.Events.ERROR,
                        (_, data) => {

                            if (cancelled) {
                                return;
                            }


                            console.error(
                                "HLS ERROR:",
                                {
                                    type: data.type,
                                    details: data.details,
                                    fatal: data.fatal,
                                    response: data.response,
                                    url: data.url,
                                },
                            );


                            // --------------------------------------
                            // Fatal error recovery
                            // --------------------------------------

                            if (
                                data.fatal &&
                                hls
                            ) {

                                switch (data.type) {

                                    case Hls.ErrorTypes.NETWORK_ERROR:

                                        console.error(
                                            "HLS fatal network error. Retrying...",
                                        );

                                        hls.startLoad();

                                        break;


                                    case Hls.ErrorTypes.MEDIA_ERROR:

                                        console.error(
                                            "HLS fatal media error. Recovering...",
                                        );

                                        hls.recoverMediaError();

                                        break;


                                    default:

                                        console.error(
                                            "HLS fatal unrecoverable error.",
                                        );

                                        hls.destroy();

                                        hls = null;

                                        break;
                                }
                            }
                        },
                    );


                    // ==================================================
                    // REGISTER FRAGMENT EVENT
                    // ==================================================

                    hls.on(
                        Hls.Events.FRAG_LOADED,
                        handleFragmentLoaded,
                    );


                    // ==================================================
                    // ATTACH MEDIA FIRST
                    // ==================================================

                    hls.attachMedia(
                        currentVideoElement,
                    );


                    // ==================================================
                    // LOAD HLS SOURCE
                    // ==================================================

                    hls.loadSource(
                        playbackUrl,
                    );
                }


                // ==================================================
                // SAFARI / NATIVE HLS
                // ==================================================

                else if (
                    currentVideoElement.canPlayType(
                        "application/vnd.apple.mpegurl",
                    )
                ) {

                    console.log(
                        "Using native HLS support.",
                    );


                    currentVideoElement.src =
                        playbackUrl;
                }


                else {

                    throw new Error(
                        "HLS is not supported in this browser",
                    );
                }

            } catch (error) {

                if (!cancelled) {

                    console.error(
                        "Failed to load video:",
                        error,
                    );
                }
            }
        }


        // ==================================================
        // START LOADING
        // ==================================================

        loadVideo();


        // ==================================================
        // CLEANUP
        // ==================================================

        return () => {

            console.log(
                "VideoPlayer cleanup",
            );


            // ------------------------------------------
            // Cancel async operations
            // ------------------------------------------

            cancelled = true;


            // ------------------------------------------
            // Remove play listener
            // ------------------------------------------

            videoElement.removeEventListener(
                "play",
                handlePlay,
            );


            // ------------------------------------------
            // Stop buffer monitoring
            // ------------------------------------------

            clearInterval(
                bufferInterval,
            );


            // ------------------------------------------
            // Destroy HLS
            // ------------------------------------------

            if (hls) {

                console.log(
                    "Destroying HLS instance",
                );

                hls.destroy();

                hls = null;
            }


            // ------------------------------------------
            // Reset video element
            // ------------------------------------------

            videoElement.pause();

            videoElement.removeAttribute(
                "src",
            );

            videoElement.load();
        };


    }, [videoId]);


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="player-container">

            <h1>
                Adaptive Video Streaming
            </h1>


            <video
                ref={videoRef}
                controls
                width="800"
            />


            <ABRTimeline
                entries={timeline}
            />

        </div>
    );
}