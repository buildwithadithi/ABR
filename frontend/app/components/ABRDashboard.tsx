"use client";

import { ABRDecision } from "@/app/types/abr";

interface ABRDashboardProps {
  decision: ABRDecision | null;
  bufferSeconds: number;
  bufferState: string;
}

const QUALITY_NAMES = [
  "360p",
  "480p",
  "720p",
];

function getDecisionExplanation(
  decision: ABRDecision,
) {
  if (decision.startup) {
    if (
      decision.nextLevel >
      decision.currentLevel
    ) {
      return "Startup ramp-up is testing a higher quality level.";
    }

    return "Startup ramp-up is collecting network measurements.";
  }

  if (decision.decision === "UPGRADE") {
    return "Estimated bandwidth supports a higher quality.";
  }

  if (decision.decision === "DOWNGRADE") {
    return "Available bandwidth decreased, so quality is reduced.";
  }

  return "Current quality is appropriate for the estimated bandwidth.";
}

export default function ABRDashboard({
  decision,
  bufferSeconds,
  bufferState,
}: ABRDashboardProps) {

  if (!decision) {
    return (
      <section className="abr-section">
        <h2>ABR Status</h2>

        <p>
          Waiting for the first fragment...
        </p>
      </section>
    );
  }

  const currentQuality =
    QUALITY_NAMES[decision.currentLevel] ??
    "Unknown";

  const idealQuality =
    QUALITY_NAMES[decision.idealLevel] ??
    "Unknown";

  const nextQuality =
    QUALITY_NAMES[decision.nextLevel] ??
    "Unknown";

  const explanation =
    getDecisionExplanation(decision);

  const bufferPercentage =
    Math.min(
      (bufferSeconds / 30) * 100,
      100,
    );

  return (
    <div>

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
              {decision.throughputMbps.toFixed(2)}
              {" Mbps"}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Smoothed Throughput
            </span>

            <strong>
              {decision.smoothedThroughputMbps.toFixed(2)}
              {" Mbps"}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Safe Throughput
            </span>

            <strong>
              {decision.safeThroughputMbps.toFixed(2)}
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
              {currentQuality}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Ideal
            </span>

            <strong>
              {idealQuality}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Next
            </span>

            <strong>
              {nextQuality}
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
            {decision.decision}
          </div>

          <p>
            {explanation}
          </p>

          <div className="decision-flow">

            <span>
              {currentQuality}
            </span>

            <span>
              →
            </span>

            <span>
              {nextQuality}
            </span>

          </div>

          <p className="startup-status">

            Startup:
            {" "}

            <strong>
              {decision.startup
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
              {bufferSeconds.toFixed(1)}
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

            <span>0s</span>
            <span>5s</span>
            <span>20s</span>
            <span>30s+</span>

          </div>

        </div>

      </section>

    </div>
  );
}