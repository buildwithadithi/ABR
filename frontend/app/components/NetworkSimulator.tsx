"use client";

interface NetworkSimulatorProps {
  bandwidthMbps: number;
  onBandwidthChange: (value: number) => void;
}

const PRESETS = [
  {
    name: "Very Slow",
    value: 0.5,
  },
  {
    name: "Slow",
    value: 1,
  },
  {
    name: "Moderate",
    value: 2,
  },
  {
    name: "Good",
    value: 5,
  },
  {
    name: "Fast",
    value: 10,
  },
];

export default function NetworkSimulator({
  bandwidthMbps,
  onBandwidthChange,
}: NetworkSimulatorProps) {
  return (
    <section className="abr-section">

      <h2>
        🌐 Network Simulator
      </h2>

      <p>
        Control the simulated download bandwidth
        seen by the HLS player.
      </p>

      {/* ======================================== */}
      {/* CURRENT BANDWIDTH */}
      {/* ======================================== */}

      <div className="simulator-value">
        <span>
          Simulated Bandwidth
        </span>

        <strong>
          {bandwidthMbps.toFixed(1)} Mbps
        </strong>
      </div>


      {/* ======================================== */}
      {/* SLIDER */}
      {/* ======================================== */}

      <input
        type="range"
        min="0.5"
        max="20"
        step="0.5"
        value={bandwidthMbps}
        onChange={(event) =>
          onBandwidthChange(
            Number(event.target.value),
          )
        }
      />


      <div className="slider-labels">
        <span>0.5 Mbps</span>
        <span>20 Mbps</span>
      </div>


      {/* ======================================== */}
      {/* PRESETS */}
      {/* ======================================== */}

      <div className="preset-grid">

        {PRESETS.map((preset) => (

          <button
            key={preset.name}
            type="button"
            onClick={() =>
              onBandwidthChange(
                preset.value,
              )
            }
            className={
              bandwidthMbps === preset.value
                ? "preset active"
                : "preset"
            }
          >
            <span>
              {preset.name}
            </span>

            <strong>
              {preset.value} Mbps
            </strong>
          </button>

        ))}

      </div>

    </section>
  );
}