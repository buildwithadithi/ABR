"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Hls from "hls.js";

import { ABRController } from "@/app/abr/abrController";
import { createThrottledLoader } from "@/app/simulator/ThrottledLoader";

const HLS_URL =
  "http://127.0.0.1:8000/hls/master.m3u8";

type ScenarioName =
  | "STABLE"
  | "BANDWIDTH_DROP"
  | "RECOVERY"
  | "FLUCTUATING";

type TestStatus =
  | "STOPPED"
  | "RUNNING"
  | "COMPLETED";

type DecisionType =
  | "UPGRADE"
  | "DOWNGRADE"
  | "HOLD";

interface ScenarioStep {
  bandwidth: number;
  duration: number;
}

interface Scenario {
  name: string;
  description: string;
  steps: ScenarioStep[];
}

interface DecisionRecord {
  fragment: number;
  bandwidth: number;

  throughputMbps: number;
  smoothedThroughputMbps: number;
  safeThroughputMbps: number;

  currentLevel: number;
  idealLevel: number;
  nextLevel: number;

  decision: DecisionType;
  startup: boolean;

  timestamp: number;
}


// ==================================================
// SCENARIOS
// ==================================================

const SCENARIOS: Record<
  ScenarioName,
  Scenario
> = {

  STABLE: {
    name: "Stable Network",

    description:
      "Constant 5 Mbps connection.",

    steps: [
      {
        bandwidth: 5,
        duration: 60,
      },
    ],
  },


  BANDWIDTH_DROP: {
    name: "Bandwidth Drop",

    description:
      "5 Mbps → 1 Mbps.",

    steps: [
      {
        bandwidth: 5,
        duration: 20,
      },

      {
        bandwidth: 1,
        duration: 40,
      },
    ],
  },


  RECOVERY: {
    name: "Bandwidth Recovery",

    description:
      "1 Mbps → 5 Mbps.",

    steps: [
      {
        bandwidth: 1,
        duration: 20,
      },

      {
        bandwidth: 5,
        duration: 40,
      },
    ],
  },


  FLUCTUATING: {
    name: "Fluctuating Network",

    description:
      "5 → 2 → 4 → 1 → 5 Mbps.",

    steps: [
      {
        bandwidth: 5,
        duration: 20,
      },

      {
        bandwidth: 2,
        duration: 20,
      },

      {
        bandwidth: 4,
        duration: 20,
      },

      {
        bandwidth: 1,
        duration: 20,
      },

      {
        bandwidth: 5,
        duration: 30,
      },
    ],
  },
};


// ==================================================
// QUALITY NAMES
// ==================================================

const QUALITY_NAMES = [
  "360p",
  "480p",
  "720p",
];


// ==================================================
// PAGE
// ==================================================

export default function StressTestPage() {

  // ==================================================
  // VIDEO
  // ==================================================

  const videoRef =
    useRef<HTMLVideoElement | null>(null);


  // ==================================================
  // HLS
  // ==================================================

  const hlsRef =
    useRef<Hls | null>(null);


  // ==================================================
  // ABR
  // ==================================================

  const abrControllerRef =
    useRef<ABRController | null>(null);


  // ==================================================
  // BANDWIDTH
  // ==================================================

  const bandwidthRef =
    useRef(5);

  const [
    bandwidth,
    setBandwidth,
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
  // SCENARIO
  // ==================================================

  const [
    selectedScenario,
    setSelectedScenario,
  ] =
    useState<ScenarioName>(
      "FLUCTUATING",
    );


  const [
    currentStep,
    setCurrentStep,
  ] = useState(0);


  // ==================================================
  // DECISION HISTORY
  // ==================================================

  const [
    decisions,
    setDecisions,
  ] =
    useState<DecisionRecord[]>(
      [],
    );


  const decisionsRef =
    useRef<DecisionRecord[]>(
      [],
    );


  // ==================================================
  // TIMERS
  // ==================================================

  const timerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);


  // ==================================================
  // START TIME
  // ==================================================

  const testStartRef =
    useRef<number | null>(null);


  // ==================================================
  // CLEAR TIMER
  // ==================================================

  const clearTimer =
    useCallback(() => {

      if (
        timerRef.current !== null
      ) {

        clearTimeout(
          timerRef.current,
        );

        timerRef.current = null;
      }

    }, []);


  // ==================================================
  // CHANGE BANDWIDTH
  // ==================================================

  const applyBandwidth =
    useCallback(
      (value: number) => {

        bandwidthRef.current =
          value;

        setBandwidth(
          value,
        );

        console.log(
          "🌐 BANDWIDTH:",
          value,
          "Mbps",
        );

      },
      [],
    );


  // ==================================================
  // RECORD DECISION
  // ==================================================

  const recordDecision =
    useCallback(
      (
        decision: DecisionRecord,
      ) => {

        decisionsRef.current = [
          ...decisionsRef.current,
          decision,
        ];

        setDecisions(
          [...decisionsRef.current],
        );

      },
      [],
    );


  // ==================================================
  // RUN SCENARIO
  // ==================================================

  const runScenarioStepRef =
    useRef<
      (
        scenario: ScenarioName,
        index: number,
      ) => void
    >(() => {});


  const runScenarioStep =
    useCallback(
      (
        scenario: ScenarioName,
        index: number,
      ) => {

        const steps =
          SCENARIOS[
            scenario
          ].steps;


        // --------------------------------------------
        // SCENARIO COMPLETE
        // --------------------------------------------

        if (
          index >= steps.length
        ) {

          console.log(
            "✅ STRESS TEST COMPLETE",
          );

          setStatus(
            "COMPLETED",
          );

          return;
        }


        const step =
          steps[index];


        // --------------------------------------------
        // Apply bandwidth
        // --------------------------------------------

        applyBandwidth(
          step.bandwidth,
        );


        setCurrentStep(
          index,
        );


        console.log(
          "━━━━━━━━━━━━━━━━━━━━",
        );

        console.log(
          "🧪 Scenario:",
          SCENARIOS[
            scenario
          ].name,
        );

        console.log(
          "📍 Step:",
          index + 1,
          "/",
          steps.length,
        );

        console.log(
          "🌐 Bandwidth:",
          step.bandwidth,
          "Mbps",
        );

        console.log(
          "⏱️ Duration:",
          step.duration,
          "seconds",
        );

        console.log(
          "━━━━━━━━━━━━━━━━━━━━",
        );


        // --------------------------------------------
        // Schedule next step
        // --------------------------------------------

        timerRef.current =
          setTimeout(
            () => {

              runScenarioStepRef.current(
                scenario,
                index + 1,
              );

            },
            step.duration * 1000,
          );

      },
      [
        applyBandwidth,
      ],
    );


  runScenarioStepRef.current =
    runScenarioStep;


  // ==================================================
  // START TEST
  // ==================================================

  const startTest =
    useCallback(() => {

      const video =
        videoRef.current;

      if (!video) {
        return;
      }


      if (
        hlsRef.current
      ) {
        return;
      }


      if (
        !Hls.isSupported()
      ) {

        console.error(
          "HLS.js is not supported",
        );

        return;
      }


      clearTimer();


      // --------------------------------------------
      // Reset history
      // --------------------------------------------

      decisionsRef.current =
        [];

      setDecisions(
        [],
      );


      // --------------------------------------------
      // Fresh ABR controller
      // --------------------------------------------

      abrControllerRef.current =
        new ABRController();


      // --------------------------------------------
      // Reset step
      // --------------------------------------------

      setCurrentStep(
        0,
      );


      // --------------------------------------------
      // Start bandwidth
      // --------------------------------------------

      const firstStep =
        SCENARIOS[
          selectedScenario
        ].steps[0];


      applyBandwidth(
        firstStep.bandwidth,
      );


      // --------------------------------------------
      // Start time
      // --------------------------------------------

      testStartRef.current =
        performance.now();


      // --------------------------------------------
      // Loader
      // --------------------------------------------

      const Loader =
        createThrottledLoader(
          () =>
            bandwidthRef.current,
        );


      // --------------------------------------------
      // HLS
      // --------------------------------------------

      const hls =
        new Hls({
          loader: Loader,
        });


      hlsRef.current =
        hls;


      console.log(
        "▶️ STARTING STRESS TEST",
      );

      console.log(
        "🧪 Scenario:",
        SCENARIOS[
          selectedScenario
        ].name,
      );

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
          // ABR DECISION
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
          // Tell HLS next level
          // --------------------------------------------

          hls.nextLoadLevel =
            decision.nextLevel;


          // --------------------------------------------
          // Timestamp
          // --------------------------------------------

          const elapsed =
            testStartRef.current
              ? (
                  performance.now() -
                  testStartRef.current
                ) / 1000
              : 0;


          // --------------------------------------------
          // Record
          // --------------------------------------------

          const record: DecisionRecord =
            {
              fragment:
                Number(data.frag.sn),

              bandwidth:
                bandwidthRef.current,

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

              timestamp:
                elapsed,
            };


          recordDecision(
            record,
          );


          // --------------------------------------------
          // Console
          // --------------------------------------------

          console.log(
            "📊 ABR DECISION",
            record,
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
      // START
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


      // --------------------------------------------
      // Schedule second step
      // --------------------------------------------

      timerRef.current =
        setTimeout(
          () => {

            runScenarioStepRef.current(
              selectedScenario,
              1,
            );

          },
          firstStep.duration * 1000,
        );

    }, [
      applyBandwidth,
      clearTimer,
      recordDecision,
      selectedScenario,
    ]);


  // ==================================================
  // STOP
  // ==================================================

  const stopTest =
    useCallback(() => {

      console.log(
        "⏹️ STOPPING TEST",
      );


      clearTimer();


      if (
        hlsRef.current
      ) {

        hlsRef.current.destroy();

        hlsRef.current =
          null;
      }


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

    }, [
      clearTimer,
    ]);


  // ==================================================
  // RESET
  // ==================================================

  const resetTest =
    useCallback(() => {

      console.log(
        "🔄 RESETTING TEST",
      );


      clearTimer();


      if (
        hlsRef.current
      ) {

        hlsRef.current.destroy();

        hlsRef.current =
          null;
      }


      const video =
        videoRef.current;

      if (video) {

        video.pause();

        video.removeAttribute(
          "src",
        );

        video.load();
      }


      abrControllerRef.current =
        null;


      decisionsRef.current =
        [];

      setDecisions(
        [],
      );


      bandwidthRef.current =
        5;

      setBandwidth(
        5,
      );


      setCurrentStep(
        0,
      );


      setStatus(
        "STOPPED",
      );


      testStartRef.current =
        null;


      console.log(
        "✅ RESET COMPLETE",
      );

    }, [
      clearTimer,
    ]);


  // ==================================================
  // CLEANUP
  // ==================================================

  useEffect(() => {

    return () => {

      clearTimer();


      if (
        hlsRef.current
      ) {

        hlsRef.current.destroy();

        hlsRef.current =
          null;
      }

    };

  }, [
    clearTimer,
  ]);


  // ==================================================
  // METRICS
  // ==================================================

  const upgrades =
    decisions.filter(
      (item) =>
        item.decision ===
        "UPGRADE",
    ).length;


  const downgrades =
    decisions.filter(
      (item) =>
        item.decision ===
        "DOWNGRADE",
    ).length;


  const holds =
    decisions.filter(
      (item) =>
        item.decision ===
        "HOLD",
    ).length;


  // ==================================================
  // UI
  // ==================================================

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}

      <h1>
        ABR Stress Test
      </h1>

      <p>
        Run controlled network scenarios
        against your ABR controller.
      </p>


      {/* ============================================ */}
      {/* SCENARIOS */}
      {/* ============================================ */}

      <section
        style={{
          marginTop: "30px",
        }}
      >

        <h2>
          Scenarios
        </h2>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, 1fr)",
            gap: "12px",
            marginTop: "15px",
          }}
        >

          {(
            Object.keys(
              SCENARIOS,
            ) as ScenarioName[]
          ).map(
            (scenario) => {

              const selected =
                scenario ===
                selectedScenario;


              return (
                <button
                  key={scenario}
                  type="button"
                  disabled={
                    status ===
                    "RUNNING"
                  }
                  onClick={() =>
                    setSelectedScenario(
                      scenario,
                    )
                  }
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    border:
                      selected
                        ? "2px solid black"
                        : "1px solid #ddd",
                    borderRadius: "8px",
                    background:
                      selected
                        ? "#f5f5f5"
                        : "white",
                  }}
                >

                  <strong>
                    {
                      SCENARIOS[
                        scenario
                      ].name
                    }
                  </strong>

                  <br />

                  <small>
                    {
                      SCENARIOS[
                        scenario
                      ].description
                    }
                  </small>

                </button>
              );

            },
          )}

        </div>

      </section>


      {/* ============================================ */}
      {/* CURRENT NETWORK */}
      {/* ============================================ */}

      <section
        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >

        <h2>
          Current Network
        </h2>

        <div
          style={{
            fontSize: "36px",
            fontWeight: "bold",
            marginTop: "8px",
          }}
        >
          {bandwidth.toFixed(1)}
          {" Mbps"}
        </div>

        <p>
          Step{" "}
          {currentStep + 1}
          {" / "}
          {
            SCENARIOS[
              selectedScenario
            ].steps.length
          }
        </p>

      </section>


      {/* ============================================ */}
      {/* VIDEO */}
      {/* ============================================ */}

      <section
        style={{
          marginTop: "30px",
        }}
      >

        <video
          ref={videoRef}
          controls
          width="800"
        />

      </section>


      {/* ============================================ */}
      {/* CONTROLS */}
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
          ▶️ Start
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


      {/* ============================================ */}
      {/* TEST RESULT */}
      {/* ============================================ */}

      <section
        style={{
          marginTop: "40px",
        }}
      >

        <h2>
          Test Results
        </h2>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: "12px",
            marginTop: "15px",
          }}
        >

          <Metric
            label="Fragments"
            value={
              decisions.length
            }
          />

          <Metric
            label="Upgrades"
            value={
              upgrades
            }
          />

          <Metric
            label="Downgrades"
            value={
              downgrades
            }
          />

          <Metric
            label="Holds"
            value={
              holds
            }
          />

        </div>

      </section>


      {/* ============================================ */}
      {/* DECISION TIMELINE */}
      {/* ============================================ */}

      <section
        style={{
          marginTop: "40px",
        }}
      >

        <h2>
          ABR Decision Timeline
        </h2>


        {decisions.length === 0 ? (

          <p>
            No ABR decisions yet.
            Start the test to begin.
          </p>

        ) : (

          <div
            style={{
              marginTop: "15px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >

            {decisions.map(
              (item, index) => (

                <DecisionCard
                  key={`${item.fragment}-${index}`}
                  item={item}
                />

              ),
            )}

          </div>

        )}

      </section>

    </main>
  );
}


// ==================================================
// METRIC
// ==================================================

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {

  return (
    <div
      style={{
        padding: "18px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >

      <div>
        {label}
      </div>

      <strong
        style={{
          fontSize: "28px",
        }}
      >
        {value}
      </strong>

    </div>
  );
}


// ==================================================
// DECISION CARD
// ==================================================

function DecisionCard({
  item,
}: {
  item: DecisionRecord;
}) {

  const isUpgrade =
    item.decision ===
    "UPGRADE";

  const isDowngrade =
    item.decision ===
    "DOWNGRADE";


  const arrow =
    isUpgrade
      ? "↑"
      : isDowngrade
        ? "↓"
        : "→";


  const fromQuality =
    QUALITY_NAMES[
      item.currentLevel
    ] ??
    `Level ${item.currentLevel}`;


  const toQuality =
    QUALITY_NAMES[
      item.nextLevel
    ] ??
    `Level ${item.nextLevel}`;


  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >

        <strong>

          {item.timestamp.toFixed(1)}
          {"s — "}

          {arrow}{" "}
          {item.decision}

        </strong>


        <span>
          {fromQuality}
          {" → "}
          {toQuality}
        </span>

      </div>


      <div
        style={{
          marginTop: "10px",
          fontSize: "14px",
        }}
      >

        🌐 Network:{" "}
        {item.bandwidth.toFixed(2)}
        {" Mbps"}

        {" • "}

        🚀 Throughput:{" "}
        {item.throughputMbps.toFixed(2)}
        {" Mbps"}

        {" • "}

        🛡️ Safe:{" "}
        {item.safeThroughputMbps.toFixed(2)}
        {" Mbps"}

      </div>


      <div
        style={{
          marginTop: "6px",
          fontSize: "14px",
        }}
      >

        📊 Smoothed:{" "}
        {item.smoothedThroughputMbps.toFixed(2)}
        {" Mbps"}

        {" • "}

        🎯 Ideal:{" "}
        {QUALITY_NAMES[
          item.idealLevel
        ] ??
          `Level ${item.idealLevel}`}

      </div>


      {item.startup && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "13px",
          }}
        >
          🚀 STARTUP
        </div>
      )}

    </div>
  );
}