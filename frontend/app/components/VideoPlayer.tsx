"use client";

import Hls from "hls.js";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import { ABRController } from "@/app/abr/abrController";

import {
    getBufferState,
    BufferState,
} from "@/app/abr/bufferController";

import { getFragmentMetrics } from "@/app/hls/fragmentMetrics";
import { getBufferMetrics } from "@/app/hls/bufferMetrics";

import ABRTimeline, {
    ABRTimelineEntry,
} from "@/app/components/ABRTimeline";

const HLS_URL =
    "http://127.0.0.1:8000/hls/master.m3u8";

const MAX_TIMELINE_ENTRIES = 20;


// ==================================================
// VIDEO PLAYER
// ==================================================

export default function VideoPlayer() {

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
    // BUFFER
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

        const video =
            videoRef.current;

        if (!video) {
            return;
        }


        // ==================================================
        // PLAYBACK START TRACKING
        // ==================================================

        const handlePlay = () => {

            if (
                playbackStartRef.current === null
            ) {

                playbackStartRef.current =
                    performance.now();
            }
        };


        video.addEventListener(
            "play",
            handlePlay,
        );


        // ==================================================
        // BUFFER MONITOR
        // ==================================================

        const updateBuffer = () => {
            const metrics = getBufferMetrics(video);

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


        // Run immediately.
        updateBuffer();


        // Update every 250ms.
        const bufferInterval =
            setInterval(
                updateBuffer,
                250,
            );


        // ==================================================
        // HLS.JS
        // ==================================================

        if (Hls.isSupported()) {

            const hls =
                new Hls();


            console.log(
                "HLS VERSION:",
                Hls.version,
            );


            // ==================================================
            // FRAGMENT LOADED
            // ==================================================

            const handleFragmentLoaded = (
                _: unknown,
                data: any,
            ) => {
                const metrics =
                    getFragmentMetrics(data, hls);

                if (!metrics) {
                    return;
                }

                const currentBufferSeconds =
                    bufferSecondsRef.current;

                const currentBufferState =
                    bufferStateRef.current;

                const decision =
                    abrControllerRef.current.processFragment(
                        metrics.bytesLoaded,
                        metrics.downloadTimeSeconds,
                        currentBufferSeconds,
                        metrics.segmentDurationSeconds,
                        metrics.levelBitratesMbps,
                    );

                hls.nextLoadLevel =
                    decision.nextLevel;


                // -------------------------------------------
                // TIMESTAMP
                // -------------------------------------------

                const timestamp =
                    metrics.timestamp;


                // -------------------------------------------
                // TIMELINE ENTRY
                // -------------------------------------------

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
            // REGISTER EVENT
            // ==================================================

            hls.on(
                Hls.Events.FRAG_LOADED,
                handleFragmentLoaded,
            );


            // ==================================================
            // START HLS
            // ==================================================

            hls.loadSource(HLS_URL);

            hls.attachMedia(video);


            // ==================================================
            // CLEANUP
            // ==================================================

            return () => {

                video.removeEventListener(
                    "play",
                    handlePlay,
                );

                clearInterval(
                    bufferInterval,
                );

                hls.off(
                    Hls.Events.FRAG_LOADED,
                    handleFragmentLoaded,
                );

                hls.destroy();
            };
        }


        // ==================================================
        // SAFARI / NATIVE HLS
        // ==================================================

        if (
            video.canPlayType(
                "application/vnd.apple.mpegurl",
            )
        ) {

            video.src = HLS_URL;
        }


        // ==================================================
        // NATIVE HLS CLEANUP
        // ==================================================

        return () => {

            video.removeEventListener(
                "play",
                handlePlay,
            );

            clearInterval(
                bufferInterval,
            );
        };

    }, []);


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