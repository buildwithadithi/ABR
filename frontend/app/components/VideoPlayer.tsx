"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import Hls from "hls.js";

import { ABRController } from "@/app/abr/abrController";
import { ABRDecision } from "@/app/types/abr";

import ABRDashboard from "@/app/components/ABRDashboard";

import ABRTimeline, {
    ABRTimelineEntry,
} from "@/app/components/ABRTimeline";

const HLS_URL =
    "http://127.0.0.1:8000/hls/master.m3u8";

const MAX_TIMELINE_ENTRIES = 20;


// ==================================================
// BUFFER STATE
// ==================================================

function getBufferState(
    bufferSeconds: number,
) {
    if (bufferSeconds < 5) {
        return "LOW";
    }

    if (bufferSeconds <= 20) {
        return "HEALTHY";
    }

    return "HIGH";
}


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
    // LIVE ABR STATE
    // -----------------------------------------------

    const [abrState, setAbrState] =
        useState<ABRDecision | null>(null);


    // -----------------------------------------------
    // BUFFER STATE
    // -----------------------------------------------

    const [bufferSeconds, setBufferSeconds] =
        useState(0);

    const [bufferState, setBufferState] =
        useState("LOW");


    // -----------------------------------------------
    // BUFFER REFS
    //
    // These let FRAG_LOADED access the latest
    // buffer without recreating HLS.
    // -----------------------------------------------

    const bufferSecondsRef =
        useRef(0);

    const bufferStateRef =
        useRef("LOW");


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

            if (
                video.buffered.length === 0
            ) {

                bufferSecondsRef.current = 0;

                bufferStateRef.current =
                    "LOW";

                setBufferSeconds(0);

                setBufferState("LOW");

                return;
            }


            const currentTime =
                video.currentTime;

            let buffer = 0;


            // -----------------------------------------------
            // FIND BUFFERED RANGE CONTAINING CURRENT TIME
            // -----------------------------------------------

            for (
                let i = 0;
                i < video.buffered.length;
                i++
            ) {

                const start =
                    video.buffered.start(i);

                const end =
                    video.buffered.end(i);


                if (
                    currentTime >= start &&
                    currentTime <= end
                ) {

                    buffer =
                        Math.max(
                            0,
                            end - currentTime,
                        );

                    break;
                }
            }


            const state =
                getBufferState(buffer);


            // -----------------------------------------------
            // UPDATE REFS
            // -----------------------------------------------

            bufferSecondsRef.current =
                buffer;

            bufferStateRef.current =
                state;


            // -----------------------------------------------
            // UPDATE UI
            // -----------------------------------------------

            setBufferSeconds(buffer);

            setBufferState(state);
        };


        // Run immediately.

        updateBuffer();


        // Then update every 250ms.

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

            const handleFragmentLoaded =
                (
                    _: unknown,
                    data: any,
                ) => {

                    const stats =
                        data.frag.stats;


                    const downloadTime =
                        (
                            stats.loading.end -
                            stats.loading.start
                        ) / 1000;


                    if (
                        downloadTime <= 0 ||
                        stats.loaded <= 0
                    ) {
                        return;
                    }


                    // ==============================================
                    // ABR CONTROLLER
                    // ==============================================

                    const decision =
                        abrControllerRef.current
                            .processFragment(
                                stats.loaded,
                                downloadTime,
                            );


                    // ==============================================
                    // TELL HLS WHICH LEVEL TO LOAD NEXT
                    // ==============================================

                    hls.nextLoadLevel =
                        decision.nextLevel;


                    // ==============================================
                    // GET LATEST BUFFER
                    // ==============================================

                    const currentBufferSeconds =
                        bufferSecondsRef.current;

                    const currentBufferState =
                        bufferStateRef.current;


                    // ==============================================
                    // UPDATE LIVE ABR STATE
                    // ==============================================

                    setAbrState({
                        ...decision,

                        bufferSeconds:
                            currentBufferSeconds,

                        bufferState:
                            currentBufferState as
                            "LOW" |
                            "HEALTHY" |
                            "HIGH",
                    });


                    // ==============================================
                    // TIMELINE TIMESTAMP
                    // ==============================================


                    const timestamp =
                        data.frag.start;;


                    // ==============================================
                    // ADD TIMELINE ENTRY
                    // ==============================================

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


                            // Keep only the latest
                            // 20 decisions.

                            return updated.slice(
                                -MAX_TIMELINE_ENTRIES,
                            );
                        },
                    );


                    // ==============================================
                    // DEBUG
                    // ==============================================

                    console.log(
                        "━━━━━━━━━━━━━━━━━━━━",
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
                        "Video time:",
                        timestamp.toFixed(2),
                        "sec",
                    );

                    console.log(
                        "━━━━━━━━━━━━━━━━━━━━",
                    );
                };


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

            {/* ============================================ */}
            {/* TITLE */}
            {/* ============================================ */}

            <h1>
                Adaptive Video Streaming
            </h1>


            {/* ============================================ */}
            {/* VIDEO PLAYER */}
            {/* ============================================ */}

            <video
                ref={videoRef}
                controls
                width="800"
            />


            {/* ============================================ */}
            {/* LIVE ABR DASHBOARD */}
            {/* ============================================ */}

            <ABRDashboard
                decision={abrState}
                bufferSeconds={bufferSeconds}
                bufferState={bufferState}
            />


            {/* ============================================ */}
            {/* ABR DECISION TIMELINE */}
            {/* ============================================ */}

            <ABRTimeline
                entries={timeline}
            />

        </div>
    );
}