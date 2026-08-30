"use client";

import { ABRDecisionType } from "@/app/types/abr";

export interface ABRTimelineEntry {
  timestamp: number;

  throughputMbps: number;
  smoothedThroughputMbps: number;
  safeThroughputMbps: number;

  currentLevel: number;
  idealLevel: number;
  nextLevel: number;

  decision: ABRDecisionType;
  startup: boolean;
}

interface ABRTimelineProps {
  entries: ABRTimelineEntry[];
}

const QUALITY_NAMES = [
  "360p",
  "480p",
  "720p",
];

function getQualityName(level: number) {
  return (
    QUALITY_NAMES[level] ??
    `Level ${level}`
  );
}

function getDecisionSymbol(
  decision: ABRDecisionType,
) {
  if (decision === "UPGRADE") {
    return "↑";
  }

  if (decision === "DOWNGRADE") {
    return "↓";
  }

  return "→";
}

export default function ABRTimeline({
  entries,
}: ABRTimelineProps) {

  return (
    <section className="abr-section">

      <h2>
        🕒 ABR Decision Timeline
      </h2>

      {entries.length === 0 ? (
        <p>
          Waiting for ABR decisions...
        </p>
      ) : (
        <div className="timeline-container">

          {entries.map((entry, index) => {

            const currentQuality =
              getQualityName(
                entry.currentLevel,
              );

            const nextQuality =
              getQualityName(
                entry.nextLevel,
              );

            return (
              <div
                key={`${entry.timestamp}-${index}`}
                className="timeline-entry"
              >

                {/* TIME */}

                <div className="timeline-time">
                  {entry.timestamp.toFixed(1)}s
                </div>


                {/* DECISION */}

                <div className="timeline-decision">

                  <strong>
                    {getDecisionSymbol(
                      entry.decision,
                    )}{" "}
                    {entry.decision}
                  </strong>

                  <span>
                    {currentQuality}
                    {" → "}
                    {nextQuality}
                  </span>

                </div>


                {/* NETWORK */}

                <div className="timeline-network">

                  <span>
                    Throughput:
                    {" "}
                    {entry.throughputMbps.toFixed(2)}
                    {" Mbps"}
                  </span>

                  <span>
                    Safe:
                    {" "}
                    {entry.safeThroughputMbps.toFixed(2)}
                    {" Mbps"}
                  </span>

                </div>


                {/* STARTUP */}

                {entry.startup && (
                  <div className="timeline-startup">
                    STARTUP
                  </div>
                )}

              </div>
            );
          })}

        </div>
      )}

    </section>
  );
}