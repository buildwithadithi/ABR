"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

const HLS_URL = "http://127.0.0.1:8000/hls/master.m3u8";
const SAFETY_FACTOR = 0.8;
const LOW_BUFFER = 5;
const TARGET_BUFFER = 20;
const MAX_BUFFER = 30;

function getBufferAction(bufferSeconds: number) {
  if (bufferSeconds < LOW_BUFFER) {
    return "FILL";
  }

  if (bufferSeconds < TARGET_BUFFER) {
    return "NORMAL";
  }

  if (bufferSeconds < MAX_BUFFER) {
    return "ENOUGH";
  }

  return "FULL";
}
function chooseQuality(safeThroughput: number) {
  if (safeThroughput >= 2.5) {
    return 2;
  }

  if (safeThroughput >= 1.0) {
    return 1;
  }

  return 0;
}

function getBufferState(bufferSeconds: number) {
  if (bufferSeconds < 5) {
    return "LOW";
  }

  if (bufferSeconds <= 20) {
    return "HEALTHY";
  }

  return "HIGH";
}

function decideNextLevel(
  currentLevel: number,
  idealLevel: number,
  safeThroughput: number,
  bufferState: string,
  bufferAction: string,
) {
  // -------------------------
  // DOWNGRADE
  // -------------------------
  if (idealLevel < currentLevel) {
    return idealLevel;
  }

  // -------------------------
  // UPGRADE
  // -------------------------
  if (idealLevel > currentLevel) {
    // Don't increase when buffer is low
    if (bufferState === "LOW") {
      return currentLevel;
    }

    // Don't increase when we already have a large buffer
    if (bufferAction === "FULL") {
      return currentLevel;
    }

    // Hysteresis:
    // Require stronger throughput before upgrading.
    if (currentLevel === 0 && safeThroughput < 1.5) {
      return currentLevel;
    }

    if (currentLevel === 1 && safeThroughput < 3.0) {
      return currentLevel;
    }

    return idealLevel;
  }

  return currentLevel;
}

function shouldLoadMore(bufferSeconds: number) {
  return bufferSeconds < TARGET_BUFFER;
}
export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const throughputSamples: number[] = [];
  const currentLevelRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 5,
      });
      console.log("HLS CONFIG:", {
        maxBufferLength: hls.config.maxBufferLength,
        maxMaxBufferLength: hls.config.maxMaxBufferLength,
        maxBufferSize: hls.config.maxBufferSize,
      });

      console.log("HLS VERSION:", Hls.version);

      // Listen BEFORE starting the HLS download
      hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
        console.log("🔥 FRAG_LOADED fired");

        console.log("FULL DATA:", data);

        const stats = data.frag.stats;

        console.log("STATS:", stats);

        console.log("Bytes loaded:", stats.loaded);
        console.log("Loading start:", stats.loading.start);
        console.log("First byte:", stats.loading.first);
        console.log("Loading end:", stats.loading.end);

        const downloadTime = (stats.loading.end - stats.loading.start) / 1000;

        console.log("Download time:", downloadTime, "seconds");

        if (downloadTime <= 0 || stats.loaded <= 0) {
          console.log("Invalid measurement");
          return;
        }

        const throughputMbps = (stats.loaded * 8) / downloadTime / 1_000_000;

        throughputSamples.push(throughputMbps);

        if (throughputSamples.length > 3) {
          throughputSamples.shift();
        }

        const sum = throughputSamples.reduce(
          (total, value) => total + value,
          0,
        );

        const smoothedThroughput = sum / throughputSamples.length;

        const safeThroughput = smoothedThroughput * SAFETY_FACTOR;

        let bufferLength = 0;
        let bufferState = "LOW";
        let bufferAction = "FILL";

        if (video.buffered.length > 0) {
          const bufferEnd = video.buffered.end(0);

          bufferLength = bufferEnd - video.currentTime;

          const shouldContinueBuffering = shouldLoadMore(bufferLength);

          console.log(
            "📥 Should continue buffering:",
            shouldContinueBuffering
          );

          bufferAction = getBufferAction(bufferLength);
          bufferState = getBufferState(bufferLength);

          console.log("📦 Buffer:", bufferLength.toFixed(2), "seconds");
          console.log("🔋 Buffer state:", bufferState);
          console.log("📦 Buffer action:", bufferAction);
        }

        const currentLevel = currentLevelRef.current;

        const idealLevel = chooseQuality(safeThroughput);

        const nextLevel = decideNextLevel(
          currentLevel,
          idealLevel,
          safeThroughput,
          bufferState,
          bufferAction,
        );
        currentLevelRef.current = nextLevel;

        hls.nextLoadLevel = nextLevel;

        console.log("🛡️ Safe throughput:", safeThroughput.toFixed(2), "Mbps");
        console.log("━━━━━━━━━━━━━━━━━━━━");
        console.log("Current:", currentLevel);
        console.log("Ideal:", idealLevel);
        console.log("Buffer:", bufferLength.toFixed(2), "sec");
        console.log("State:", bufferState);
        console.log("Action:", bufferAction);
        console.log("Next:", nextLevel);
        console.log("━━━━━━━━━━━━━━━━━━━━");
      });

      // Start HLS only AFTER the listener is registered
      hls.loadSource(HLS_URL);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_URL;
    }
  }, []);

  return <video ref={videoRef} controls width="800" />;
}
