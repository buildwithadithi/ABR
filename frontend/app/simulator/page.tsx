"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Hls from "hls.js";

import { ABRController } from "@/app/abr/abrController";

import NetworkSimulator from "@/app/components/NetworkSimulator";

import { createThrottledLoader } from "./ThrottledLoader";

const HLS_URL =
  "http://127.0.0.1:8000/hls/master.m3u8";


type TestStatus =
  | "STOPPED"
  | "RUNNING";


export default function SimulatorPage() {

  // ==================================================
  // VIDEO
  // ==================================================

  const videoRef =
    useRef<HTMLVideoElement | null>(null);


  // ==================================================
  // HLS INSTANCE
  // ==================================================

  const hlsRef =
    useRef<Hls | null>(null);


  // ==================================================
  // BANDWIDTH
  // ==================================================

  const bandwidthRef =
    useRef(5);

  const [
    bandwidthMbps,
    setBandwidthMbps,
  ] = useState(5);


  // ==================================================
  // STATUS
  // ==================================================

  const [
    status,
    setStatus,
  ] = useState<TestStatus>(
    "STOPPED",
  );


  // ==================================================
  // ABR CONTROLLER
  // ==================================================

  const abrControllerRef =
    useRef<ABRController | null>(
      null,
    );


  // ==================================================
  // UPDATE BANDWIDTH
  // ==================================================

  const handleBandwidthChange =
    useCallback(
      (value: number) => {

        bandwidthRef.current =
          value;

        setBandwidthMbps(
          value,
        );

        console.log(
          "🌐 Simulated bandwidth changed:",
          value,
          "Mbps",
        );
      },
      [],
    );


  // ==================================================
  // STOP HLS
  // ==================================================

  const stopTest =
    useCallback(() => {

      console.log(
        "⏹️ Stopping network simulation",
      );


      // ----------------------------------------------
      // Destroy HLS
      // ----------------------------------------------

      if (hlsRef.current) {

        hlsRef.current.destroy();

        hlsRef.current = null;
      }


      // ----------------------------------------------
      // Stop video
      // ----------------------------------------------

      const video =
        videoRef.current;

      if (video) {

        video.pause();

        video.removeAttribute(
          "src",
        );

        video.load();
      }


      setStatus(
        "STOPPED",
      );

    }, []);


  // ==================================================
  // START HLS
  // ==================================================

  const startTest =
    useCallback(() => {

      const video =
        videoRef.current;

      if (!video) {
        return;
      }


      // Don't create two HLS instances.

      if (hlsRef.current) {
        return;
      }


      if (!Hls.isSupported()) {

        console.error(
          "HLS.js is not supported",
        );

        return;
      }


      console.log(
        "▶️ Starting network simulation",
      );

      console.log(
        "🌐 Initial bandwidth:",
        bandwidthRef.current,
        "Mbps",
      );


      // ----------------------------------------------
      // NEW ABR CONTROLLER
      // ----------------------------------------------

      abrControllerRef.current =
        new ABRController();


      // ----------------------------------------------
      // THROTTLED LOADER
      // ----------------------------------------------

      const Loader =
        createThrottledLoader(
          () =>
            bandwidthRef.current,
        );


      // ----------------------------------------------
      // HLS
      // ----------------------------------------------

      const hls =
        new Hls({
          loader: Loader,
        });


      hlsRef.current =
        hls;


      console.log(
        "HLS VERSION:",
        Hls.version,
      );


      // ==================================================
      // FRAGMENT LOADED
      // ==================================================

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
          // ABR CONTROLLER
          // --------------------------------------------

          const decision =
            abrControllerRef.current
              ?.processFragment(
                stats.loaded,
                downloadTime,
              );


          if (!decision) {
            return;
          }


          // --------------------------------------------
          // NEXT QUALITY
          // --------------------------------------------

          hls.nextLoadLevel =
            decision.nextLevel;


          // --------------------------------------------
          // DEBUG
          // --------------------------------------------

          console.log(
            "━━━━━━━━━━━━━━━━━━━━",
          );

          console.log(
            "🌐 Simulated bandwidth:",
            bandwidthRef.current.toFixed(2),
            "Mbps",
          );

          console.log(
            "📦 Downloaded level:",
            data.frag.level,
          );

          console.log(
            "📦 Bytes:",
            stats.loaded,
          );

          console.log(
            "⏱️ Download time:",
            downloadTime.toFixed(2),
            "sec",
          );

          console.log(
            "🚀 Throughput:",
            decision.throughputMbps.toFixed(2),
            "Mbps",
          );

          console.log(
            "📊 Smoothed:",
            decision.smoothedThroughputMbps.toFixed(2),
            "Mbps",
          );

          console.log(
            "🛡️ Safe:",
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


      // ==================================================
      // ERROR
      // ==================================================

      hls.on(
        Hls.Events.ERROR,
        (_, data) => {

          console.error(
            "HLS ERROR:",
            data,
          );
        },
      );


      // ==================================================
      // START HLS
      // ==================================================

      hls.loadSource(
        HLS_URL,
      );

      hls.attachMedia(
        video,
      );


      setStatus(
        "RUNNING",
      );

    }, []);


  // ==================================================
  // RESET
  // ==================================================

  const resetTest =
    useCallback(() => {

      console.log(
        "🔄 Resetting simulator",
      );


      // ----------------------------------------------
      // Stop current test
      // ----------------------------------------------

      if (hlsRef.current) {

        hlsRef.current.destroy();

        hlsRef.current = null;
      }


      // ----------------------------------------------
      // Reset video
      // ----------------------------------------------

      const video =
        videoRef.current;

      if (video) {

        video.pause();

        video.removeAttribute(
          "src",
        );

        video.load();
      }


      // ----------------------------------------------
      // Reset ABR controller
      // ----------------------------------------------

      abrControllerRef.current =
        null;


      // ----------------------------------------------
      // Reset bandwidth
      // ----------------------------------------------

      bandwidthRef.current =
        5;

      setBandwidthMbps(
        5,
      );


      // ----------------------------------------------
      // Reset status
      // ----------------------------------------------

      setStatus(
        "STOPPED",
      );


      console.log(
        "✅ Simulator reset",
      );

    }, []);


  // ==================================================
  // CLEANUP
  // ==================================================

  useEffect(() => {

    return () => {

      if (hlsRef.current) {

        hlsRef.current.destroy();

        hlsRef.current = null;
      }

    };

  }, []);


  // ==================================================
  // UI
  // ==================================================

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >

      {/* ============================================ */}
      {/* TITLE */}
      {/* ============================================ */}

      <h1>
        Network Simulator
      </h1>

      <p>
        Test how your ABR controller reacts
        to controlled network conditions.
      </p>


      {/* ============================================ */}
      {/* STATUS */}
      {/* ============================================ */}

      <div
        style={{
          marginTop: "20px",
          padding: "12px 16px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          display: "inline-block",
        }}
      >

        Status:{" "}

        <strong>
          {status}
        </strong>

      </div>


      {/* ============================================ */}
      {/* VIDEO */}
      {/* ============================================ */}

      <div
        style={{
          marginTop: "30px",
        }}
      >

        <video
          ref={videoRef}
          controls
          width="800"
        />

      </div>


      {/* ============================================ */}
      {/* NETWORK SIMULATOR */}
      {/* ============================================ */}

      <div
        style={{
          marginTop: "30px",
        }}
      >

        <NetworkSimulator
          bandwidthMbps={
            bandwidthMbps
          }
          onBandwidthChange={
            handleBandwidthChange
          }
        />

      </div>


      {/* ============================================ */}
      {/* TEST CONTROLS */}
      {/* ============================================ */}

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "20px",
        }}
      >

        <button
          type="button"
          onClick={startTest}
          disabled={
            status === "RUNNING"
          }
        >
          ▶️ Start Test
        </button>


        <button
          type="button"
          onClick={stopTest}
          disabled={
            status === "STOPPED"
          }
        >
          ⏹️ Stop
        </button>


        <button
          type="button"
          onClick={resetTest}
        >
          🔄 Reset
        </button>

      </div>

    </main>
  );
}