import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ScanSearch,
  ShieldCheck,
  Zap,
} from "lucide-react";
import "./IntelligenceCore.css";
import "./IntelligenceCoreStates.css";

const STATES = {
  monitoring: {
    eyebrow: "SYSTEM MONITORING",
    title: "All signals normal",
    message: "Five network nodes under observation.",
    color: "green",
    finding: "00",
    cause: "None",
  },
  investigating: {
    eyebrow: "ANOMALY DETECTED",
    title: "Investigating R2–R4",
    message: "Correlating BGP, interface and probe evidence.",
    color: "coral",
    finding: "04",
    cause: "R2–R4",
  },
};

export default function IntelligenceCore() {
  const [mode, setMode] = useState("monitoring");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const state = STATES[mode];
  const faulty = mode === "investigating";

  function handlePointerMove(event) {
    if (event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      x: Math.max(-1, Math.min(1, -y * 2)),
      y: Math.max(-1, Math.min(1, x * 2)),
    });
  }

  return (
    <div className="intelligence-showcase">
      <div className="intelligence-header">
        <span className="intelligence-overline">
          <Activity size={15} />
          NETSCOPE INTELLIGENCE ENGINE
        </span>

        <span className="intelligence-live">
          <span />
          INTERACTIVE CONCEPT
        </span>
      </div>

      <div
        className="intelligence-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div className="intelligence-glow" />

        <div
          className={`intelligence-assembly ${faulty ? "is-fault" : ""}`}
          style={{
            "--tilt-x": `${tilt.x * 5}deg`,
            "--tilt-y": `${tilt.y * 6}deg`,
          }}
        >
          <div className="intelligence-orbit orbit-one">
            <span className="orbit-satellite" />
          </div>

          <div className="intelligence-orbit orbit-two">
            <span className="orbit-satellite" />
          </div>

          <div className="intelligence-orbit orbit-three">
            <span className="orbit-satellite" />
          </div>

          <div className="intelligence-core">
            <div className="intelligence-core-inner">
              <Cpu size={34} strokeWidth={1.5} />
              <strong>NETSCOPE</strong>
              <small>{faulty ? "ANALYZING" : "OBSERVING"}</small>
            </div>
          </div>

          <div className="intelligence-signal signal-one" />
          <div className="intelligence-signal signal-two" />
          <div className="intelligence-signal signal-three" />
        </div>

        <div className="intelligence-floating-card floating-left">
          <span className="intelligence-floating-label">
            <Activity size={13} />
            NETWORK STATE
          </span>

          <strong>{faulty ? "Anomaly detected" : "All systems healthy"}</strong>

          <div className={`intelligence-mini-wave ${faulty ? "fault" : ""}`}>
            {Array.from({ length: 16 }, (_, i) => (
              <i key={i} style={{ "--i": i }} />
            ))}
          </div>
        </div>

        <div className="intelligence-floating-card floating-right">
          <span className="intelligence-floating-label">
            <ScanSearch size={13} />
            ROOT CAUSE
          </span>

          <strong>{faulty ? "R2–R4 link" : "No faults found"}</strong>

          <span className="intelligence-floating-detail">
            {faulty ? "Leading hypothesis" : "Monitoring active"}
          </span>
        </div>
      </div>

      <div className="intelligence-bottom">
        <div className="intelligence-mode-head">
          <div>
            <small>{state.eyebrow}</small>
            <strong>{state.title}</strong>
            <p>{state.message}</p>
          </div>

          {faulty ? (
            <AlertTriangle size={24} color="#EA8B69" />
          ) : (
            <CheckCircle2 size={24} color="#A5D5AD" />
          )}
        </div>

        <div className="intelligence-mode-buttons">
          <button
            type="button"
            className={!faulty ? "selected" : ""}
            aria-pressed={!faulty}
            onClick={() => setMode("monitoring")}
          >
            <ShieldCheck size={17} />
            Monitor
          </button>

          <button
            type="button"
            className={faulty ? "selected warning" : ""}
            aria-pressed={faulty}
            onClick={() => setMode("investigating")}
          >
            <Zap size={17} />
            Investigate
          </button>
        </div>

        <div className="intelligence-metrics">
          <div>
            <span>NETWORK FINDINGS</span>
            <strong>{state.finding}</strong>
          </div>

          <div>
            <span>ROOT-CAUSE CANDIDATE</span>
            <strong>{state.cause}</strong>
          </div>
        </div>

        <p className="intelligence-disclaimer">
          Animated conceptual preview · Not live network telemetry
        </p>
      </div>
    </div>
  );
}
