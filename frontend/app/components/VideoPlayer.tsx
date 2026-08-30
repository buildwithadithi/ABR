"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

import { ABRController } from "@/app/abr/abrController";
import type { ABRDecision } from "@/app/types/abr";

const HLS_URL =
  "http://127.0.0.1:8000/hls/master.m3u8";

// --------------------------------------------------
// QUALITY NAMES
// --------------------------------------------------

const QUALITY_NAMES = [
  "360p",
  "480p",
  "720p",
];

// --------------------------------------------------
// DECISION EXPLANATION
// --------------------------------------------------

function getDecisionExplanation(
  decision: ABRDecision,
) {
  if (decision.startup) {
    if (decision.nextLevel > decision.currentLevel) {
      return "Startup ramp-up: testing a higher quality level.";
    }

    return "Startup ramp-up: collecting network measurements.";
  }

  if (decision.decision === "UPGRADE") {
    return "Estimated bandwidth supports a higher quality.";
  }

  if (decision.decision === "DOWNGRADE") {
    return "Available bandwidth decreased, so quality is reduced.";
  }

  if (decision.decision === "HOLD") {
    return "Current quality is appropriate for the estimated bandwidth.";
  }

  return "ABR is maintaining the current quality.";
}

// --------------------------------------------------
// BUFFER STATE
// --------------------------------------------------

function getBufferState(bufferSeconds: number) {
  if (bufferSeconds < 5) {
    return "LOW";
  }

  if (bufferSeconds <= 20) {
    return "HEALTHY";
  }

  return "HIGH";
}

// --------------------------------------------------
// VIDEO PLAYER
// --------------------------------------------------

export default function VideoPlayer() {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const abrControllerRef =
    useRef(new ABRController());

  const [abrState, setAbrState] =
    useState<ABRDecision | null>(null);

  const [bufferSeconds, setBufferSeconds] =
    useState(0);

  const [bufferState, setBufferState] =
    useState("LOW");

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    // ------------------------------------------------
    // BUFFER MONITOR
    // ------------------------------------------------

    const updateBuffer = () => {
      if (
        video.buffered.length === 0
      ) {
        setBufferSeconds(0);
        setBufferState("LOW");
        return;
      }

      const currentTime =
        video.currentTime;

      let buffer = 0;

      // Find the buffered range containing
      // the current playback position.
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
          buffer = end - currentTime;
          break;
        }
      }

      const state =
        getBufferState(buffer);

      setBufferSeconds(buffer);
      setBufferState(state);
    };

    const bufferInterval =
      setInterval(
        updateBuffer,
        250,
      );

    // ------------------------------------------------
    // HLS.JS
    // ------------------------------------------------

    if (Hls.isSupported()) {
      const hls = new Hls();

      console.log(
        "HLS VERSION:",
        Hls.version,
      );

      // ------------------------------------------------
      // FRAGMENT LOADED
      // ------------------------------------------------

      hls.on(
        Hls.Events.FRAG_LOADED,
        (_, data) => {
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

          // --------------------------------------------
          // GIVE NETWORK MEASUREMENT TO ABR CONTROLLER
          // --------------------------------------------

          const decision =
            abrControllerRef.current
              .processFragment(
                stats.loaded,
                downloadTime,
              );

          // --------------------------------------------
          // TELL HLS WHICH LEVEL TO LOAD NEXT
          // --------------------------------------------

          hls.nextLoadLevel =
            decision.nextLevel;

          // --------------------------------------------
          // UPDATE UI
          // --------------------------------------------

          setAbrState(decision);

          // --------------------------------------------
          // DEBUG
          // --------------------------------------------

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
            "━━━━━━━━━━━━━━━━━━━━",
          );
        },
      );

      // ------------------------------------------------
      // START HLS
      // ------------------------------------------------

      hls.loadSource(HLS_URL);

      hls.attachMedia(video);

      // ------------------------------------------------
      // CLEANUP
      // ------------------------------------------------

      return () => {
        clearInterval(
          bufferInterval,
        );

        hls.destroy();
      };
    }

    // ------------------------------------------------
    // SAFARI / NATIVE HLS
    // ------------------------------------------------

    if (
      video.canPlayType(
        "application/vnd.apple.mpegurl",
      )
    ) {
      video.src = HLS_URL;
    }

    return () => {
      clearInterval(
        bufferInterval,
      );
    };
  }, []);

  // --------------------------------------------------
  // INITIAL STATE
  // --------------------------------------------------

  if (!abrState) {
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

        <div className="abr-panel">
          <h2>
            ABR Status
          </h2>

          <p>
            Waiting for the first fragment...
          </p>
        </div>

      </div>
    );
  }

  // --------------------------------------------------
  // BUFFER
  // --------------------------------------------------

  const displayedBuffer =
    bufferSeconds;

  const bufferPercentage =
    Math.min(
      (displayedBuffer / 30) * 100,
      100,
    );

  // --------------------------------------------------
  // DECISION EXPLANATION
  // --------------------------------------------------

  const explanation =
    getDecisionExplanation(
      abrState,
    );

  return (
    <div className="player-container">

      {/* ============================================ */}
      {/* TITLE */}
      {/* ============================================ */}

      <h1>
        Adaptive Video Streaming
      </h1>

      {/* ============================================ */}
      {/* VIDEO */}
      {/* ============================================ */}

      <video
        ref={videoRef}
        controls
        width="800"
      />

      {/* ============================================ */}
      {/* NETWORK */}
      {/* ============================================ */}

      <section className="abr-section">

        <h2>
          📡 Network Statistics
        </h2>

        <div className="stats-grid">

          <div className="stat-card">
            <span>
              Throughput
            </span>

            <strong>
              {abrState.throughputMbps.toFixed(2)}
              {" Mbps"}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Smoothed Throughput
            </span>

            <strong>
              {abrState.smoothedThroughputMbps.toFixed(2)}
              {" Mbps"}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Safe Throughput
            </span>

            <strong>
              {abrState.safeThroughputMbps.toFixed(2)}
              {" Mbps"}
            </strong>
          </div>

        </div>

      </section>

      {/* ============================================ */}
      {/* QUALITY */}
      {/* ============================================ */}

      <section className="abr-section">

        <h2>
          🎚️ Quality
        </h2>

        <div className="stats-grid">

          <div className="stat-card">
            <span>
              Current
            </span>

            <strong>
              {
                QUALITY_NAMES[
                  abrState.currentLevel
                ] ?? "Unknown"
              }
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Ideal
            </span>

            <strong>
              {
                QUALITY_NAMES[
                  abrState.idealLevel
                ] ?? "Unknown"
              }
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Next
            </span>

            <strong>
              {
                QUALITY_NAMES[
                  abrState.nextLevel
                ] ?? "Unknown"
              }
            </strong>
          </div>

        </div>

      </section>

      {/* ============================================ */}
      {/* ABR DECISION */}
      {/* ============================================ */}

      <section className="abr-section">

        <h2>
          🧠 ABR Decision
        </h2>

        <div className="decision-card">

          <div className="decision-main">
            {abrState.decision}
          </div>

          <p>
            {explanation}
          </p>

          <div className="decision-flow">

            <span>
              {
                QUALITY_NAMES[
                  abrState.currentLevel
                ]
              }
            </span>

            <span>
              →
            </span>

            <span>
              {
                QUALITY_NAMES[
                  abrState.nextLevel
                ]
              }
            </span>

          </div>

          <p className="startup-status">

            Startup:
            {" "}

            <strong>
              {abrState.startup
                ? "ACTIVE"
                : "COMPLETE"}
            </strong>

          </p>

        </div>

      </section>

      {/* ============================================ */}
      {/* BUFFER */}
      {/* ============================================ */}

      <section className="abr-section">

        <h2>
          📦 Buffer
        </h2>

        <div className="buffer-card">

          <div className="buffer-header">

            <strong>
              {displayedBuffer.toFixed(1)}
              {" seconds"}
            </strong>

            <span>
              {bufferState}
            </span>

          </div>

          <div className="buffer-bar">

            <div
              className="buffer-fill"
              style={{
                width:
                  `${bufferPercentage}%`,
              }}
            />

          </div>

          <div className="buffer-scale">

            <span>
              0s
            </span>

            <span>
              5s
            </span>

            <span>
              20s
            </span>

            <span>
              30s+
            </span>

          </div>

        </div>

      </section>

    </div>
  );
}