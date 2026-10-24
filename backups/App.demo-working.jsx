import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GitBranch,
  Network,
  RefreshCw,
  Router,
  ShieldAlert,
  Wifi,
  PlayCircle,
  Database,
  Info,
} from "lucide-react";
import "./App.css";

const SCENARIOS = [
  { id: "healthy", label: "Healthy Network" },
  { id: "link_failure", label: "Physical Link Failure" },
  { id: "bgp_failure", label: "BGP Configuration Failure" },
  { id: "multiple_faults", label: "Multiple Simultaneous Faults" },
];

const LINKS = [
  { id: "R1-R2", subnet: "10.0.12.0/30", a: "R1", b: "R2" },
  { id: "R1-R3", subnet: "10.0.13.0/30", a: "R1", b: "R3" },
  { id: "R2-R4", subnet: "10.0.24.0/30", a: "R2", b: "R4" },
  { id: "R3-R4", subnet: "10.0.34.0/30", a: "R3", b: "R4" },
  { id: "R4-R5", subnet: "10.0.45.0/30", a: "R4", b: "R5" },
];

const POSITIONS = {
  R1: { x: 115, y: 75 },
  R2: { x: 340, y: 75 },
  R3: { x: 115, y: 225 },
  R4: { x: 560, y: 150 },
  R5: { x: 560, y: 225 },
};

const titleCase = (value) =>
  String(value || "Unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

function App() {
  const [scenarioId, setScenarioId] = useState("healthy");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLink, setSelectedLink] = useState(null);

  const loadScenario = useCallback(async (id) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}demo/scenarios/${id}.json`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          `Scenario could not be loaded (HTTP ${response.status}).`,
        );
      }

      const result = await response.json();

      if (
        result.scenario?.id !== id ||
        !Array.isArray(result.telemetry?.routers) ||
        !Array.isArray(result.diagnosis?.findings) ||
        !Array.isArray(result.diagnosis?.candidate_root_causes) ||
        !Array.isArray(result.topology?.links) ||
        !Array.isArray(result.incidents)
      ) {
        throw new Error("Invalid demo scenario data structure.");
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load scenario.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScenario(scenarioId);
  }, [scenarioId, loadScenario]);

  const telemetry = data?.telemetry;
  const diagnosis = data?.diagnosis;
  const routers = telemetry?.routers ?? [];
  const findings = diagnosis?.findings ?? [];
  const rootCauses = diagnosis?.candidate_root_causes ?? [];
  const evidence = data?.evidence ?? [];
  const incidents = data?.incidents ?? [];
  const impact = diagnosis?.impact_analysis;
  const topologyLinks = data?.topology?.links ?? [];

  const getLink = (id) => topologyLinks.find((link) => link.id === id);

  const getLinkStatus = (id) => {
    const explicit = getLink(id)?.status;
    if (explicit) return explicit;

    const suspected = rootCauses.some(
      (cause) => (cause.suspected_link || cause.candidate_link) === id,
    );

    return suspected ? "failed" : "unknown";
  };

  const getRouterState = (name) => {
    const router = routers.find((item) => item.router?.toUpperCase() === name);

    if (!router || !router.healthy_collection) {
      return "unknown";
    }

    const hasFault =
      findings.some((finding) => finding.router?.toUpperCase() === name) ||
      topologyLinks.some((link) => {
        const [a, b] = link.id.split("-");
        return (a === name || b === name) && link.status !== "healthy";
      });

    return hasFault ? "fault" : "healthy";
  };

  const healthyRouterCount = routers.filter(
    (router) => getRouterState(router.router.toUpperCase()) === "healthy",
  ).length;

  const activeIncidents = incidents.filter(
    (incident) => incident.status?.toLowerCase() === "active",
  );

  const selectedLinkInfo = selectedLink ? getLink(selectedLink) : null;

  const selectedLinkEvidence = evidence.filter(
    (item) => item.link === selectedLink,
  );

  const selectedLinkCauses = rootCauses.filter(
    (cause) => (cause.suspected_link || cause.candidate_link) === selectedLink,
  );

  const scenarioChanged = (event) => {
    setScenarioId(event.target.value);
    setSelectedLink(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Network size={24} />
          </div>
          <div>
            <h1>NETSCOPE</h1>
            <span>NETWORK INTELLIGENCE</span>
          </div>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="navigation">
          <a className="nav-item active" href="#overview">
            <Activity size={18} /> Overview
          </a>
          <a className="nav-item" href="#topology">
            <GitBranch size={18} /> Network topology
          </a>
          <a className="nav-item" href="#diagnostics">
            <ShieldAlert size={18} /> Diagnostics
          </a>
          <a className="nav-item" href="#evidence">
            <Database size={18} /> Evidence
          </a>
          <a className="nav-item" href="#incident-history">
            <Clock3 size={18} /> Incidents
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-indicator">
            <span className="status-dot online" />
            <div>
              <strong>Demo Mode</strong>
              <span>Simulated scenario data</span>
            </div>
          </div>
          <p>AIORI-3 · PS-035</p>
          <p>Evidence-Based Fault Localisation</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">NETWORK OPERATIONS CENTER · DEMO MODE</div>
            <h2>Network Overview</h2>
            <p>
              Investigate network incidents using simulated telemetry,
              diagnostic evidence and topology.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() => loadScenario(scenarioId)}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            {loading ? "Loading..." : "Reload scenario"}
          </button>
        </header>

        <section className="panel" style={{ marginBottom: 24, padding: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div className="eyebrow">SIMULATION CONTROL</div>
              <h3 style={{ margin: "8px 0" }}>
                <PlayCircle
                  size={20}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 8,
                  }}
                />
                Scenario Explorer
              </h3>
              <p>
                Select a recorded scenario to explore its network symptoms and
                investigation results.
              </p>
            </div>

            <select
              value={scenarioId}
              onChange={scenarioChanged}
              aria-label="Select a demo scenario"
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #64748b",
                background: "#1e293b",
                color: "#ffffff",
                minWidth: 245,
                maxWidth: "100%",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <Info size={16} />
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              DEMO DATA — Not live router telemetry. Diagnoses are prerecorded,
              not computed by the live NETSCOPE diagnostic engine.
            </span>
          </div>

          {data?.scenario && (
            <p style={{ marginTop: 12 }}>
              <strong>{data.scenario.name}:</strong> {data.scenario.description}
            </p>
          )}
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <section id="overview" className="stats-grid">
          <StatCard
            icon={<Router size={19} />}
            label="ROUTERS MONITORED"
            value={routers.length}
            detail="Simulated network devices"
          />
          <StatCard
            icon={<CheckCircle2 size={19} />}
            label="HEALTHY ROUTERS"
            value={healthyRouterCount}
            detail="No simulated fault indications"
            accent="green"
          />
          <StatCard
            icon={<AlertTriangle size={19} />}
            label="DIAGNOSTIC FINDINGS"
            value={findings.length}
            detail="Observations requiring attention"
            accent={findings.length ? "red" : "green"}
          />
          <StatCard
            icon={<GitBranch size={19} />}
            label="ROOT-CAUSE CANDIDATES"
            value={rootCauses.length}
            detail="Suspected underlying faults"
            accent={rootCauses.length ? "amber" : "green"}
          />
        </section>

        <section id="topology" className="section-block">
          <div className="section-heading">
            <div>
              <h3>Network topology</h3>
              <p>Select a connection to inspect its simulated state</p>
            </div>
            <div className="legend">
              <span>
                <i className="legend-green" /> Healthy
              </span>
              <span>
                <i className="legend-red" /> Fault
              </span>
            </div>
          </div>

          <div className="topology-card">
            <div className="topology-canvas" style={{ position: "relative" }}>
              <svg
                className="topology-lines"
                viewBox="0 0 700 300"
                preserveAspectRatio="none"
                aria-label="Five-router topology"
              >
                {LINKS.map((link) => {
                  const a = POSITIONS[link.a];
                  const b = POSITIONS[link.b];
                  const status = getLinkStatus(link.id);

                  return (
                    <line
                      key={link.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className={status === "healthy" ? "healthy" : "fault"}
                      style={{
                        stroke:
                          status === "failed"
                            ? "#ef4444"
                            : status === "degraded"
                              ? "#f59e0b"
                              : status === "unknown"
                                ? "#94a3b8"
                                : "#22c55e",
                        strokeDasharray: status === "degraded" ? "9 6" : "none",
                      }}
                    />
                  );
                })}
              </svg>

              {Object.entries(POSITIONS).map(([name, position]) => (
                <RouterNode
                  key={name}
                  name={name}
                  x={`${(position.x / 700) * 100}%`}
                  y={`${(position.y / 300) * 100}%`}
                  state={getRouterState(name)}
                />
              ))}
            </div>

            <div className="link-list">
              {LINKS.map((link) => {
                const status = getLinkStatus(link.id);

                return (
                  <button
                    key={link.id}
                    className="link-chip"
                    onClick={() =>
                      setSelectedLink(selectedLink === link.id ? null : link.id)
                    }
                    style={{
                      cursor: "pointer",
                      textAlign: "left",
                      border:
                        selectedLink === link.id
                          ? "2px solid #60a5fa"
                          : undefined,
                    }}
                  >
                    <span
                      className={`link-indicator ${
                        status === "healthy" ? "healthy" : "fault"
                      }`}
                      style={{
                        background:
                          status === "degraded" ? "#f59e0b" : undefined,
                      }}
                    />
                    <strong>{link.id}</strong>
                    <span>{link.subnet}</span>
                    <span
                      className={`state-label ${
                        status !== "healthy" ? "fault" : ""
                      }`}
                    >
                      {titleCase(status)}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedLink && (
              <div className="panel" style={{ margin: 18, padding: 20 }}>
                <h4>{selectedLink} — Connection details</h4>
                <p>
                  Status:{" "}
                  <strong>
                    {titleCase(selectedLinkInfo?.status || "unknown")}
                  </strong>
                </p>
                <p>
                  Physical status:{" "}
                  {titleCase(
                    selectedLinkInfo?.physical_status || "Not measured",
                  )}
                </p>
                <p>
                  BGP status:{" "}
                  {titleCase(selectedLinkInfo?.bgp_status || "Not specified")}
                </p>
                <p>Related evidence: {selectedLinkEvidence.length}</p>
                <p>Root-cause candidates: {selectedLinkCauses.length}</p>
              </div>
            )}

            <p className="disclaimer">
              Topology and status values are simulated. Physical topology
              connectivity does not prove end-to-end routing reachability.
            </p>
          </div>
        </section>

        <section className="lower-grid">
          <div id="diagnostics" className="section-block">
            <div className="section-heading">
              <div>
                <h3>Fault diagnostics</h3>
                <p>Recorded findings for this scenario</p>
              </div>
              <span className="pill">{findings.length} findings</span>
            </div>

            <div className="panel">
              {findings.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={24} />}
                  title="No findings"
                  message="No faults are defined in this demo scenario."
                />
              ) : (
                findings.map((finding, index) => (
                  <div className="finding-row" key={finding.id || index}>
                    <div className="finding-icon">
                      <ShieldAlert size={19} />
                    </div>

                    <div className="finding-content">
                      <div className="finding-title">
                        <strong>{titleCase(finding.type)}</strong>
                        <span
                          className={`severity ${finding.severity?.toLowerCase()}`}
                        >
                          {finding.severity}
                        </span>
                      </div>

                      <p>
                        {finding.message ||
                          `${titleCase(finding.type)} detected on ${
                            finding.link || finding.router
                          }.`}
                      </p>

                      <span className="finding-meta">
                        {finding.router}
                        {finding.link ? ` · ${finding.link}` : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section-block">
            <div className="section-heading">
              <div>
                <h3>Root-cause candidates</h3>
                <p>Evidence-backed fault hypotheses</p>
              </div>
            </div>

            <div className="panel">
              {rootCauses.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={24} />}
                  title="No suspected root cause"
                  message="This scenario contains no recorded root-cause candidates."
                />
              ) : (
                rootCauses.map((cause, index) => (
                  <div className="root-cause" key={cause.id || index}>
                    <div className="root-cause-top">
                      <div className="root-cause-icon">
                        <GitBranch size={19} />
                      </div>
                      <div>
                        <strong>
                          {cause.suspected_link ||
                            cause.candidate_link ||
                            "Unknown connection"}
                        </strong>
                        <span>{titleCase(cause.type)}</span>
                      </div>
                      <span
                        className={`severity ${cause.severity?.toLowerCase()}`}
                      >
                        {cause.severity}
                      </span>
                    </div>

                    <div className="incident-summary">
                      <strong>Diagnostic assessment</strong>
                      <p>
                        {cause.explanation ||
                          cause.assessment ||
                          "No explanation available."}
                      </p>
                    </div>

                    <div className="incident-evidence">
                      <strong>Supporting evidence</strong>
                      {(cause.evidence_ids || []).map((id) => {
                        const item = evidence.find((entry) => entry.id === id);

                        return (
                          <div className="observation-row" key={id}>
                            <div className="observation-heading">
                              <span>{id}</span>
                              <span>{titleCase(item?.source)}</span>
                            </div>
                            <p>
                              {item?.message || "Evidence record unavailable"}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {cause.recommended_action && (
                      <div className="evidence-note">
                        <Info size={15} />
                        <span>{cause.recommended_action}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section id="evidence" className="section-block">
          <div className="section-heading">
            <div>
              <h3>Evidence timeline</h3>
              <p>Simulated observations ordered by timestamp</p>
            </div>
            <span className="pill">{evidence.length} observations</span>
          </div>

          <div className="panel">
            {evidence.length === 0 ? (
              <EmptyState
                icon={<Database size={24} />}
                title="No abnormal evidence"
                message="No evidence entries are defined for this healthy scenario."
              />
            ) : (
              [...evidence]
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .map((item) => (
                  <div className="finding-row" key={item.id}>
                    <div className="finding-icon">
                      <Activity size={18} />
                    </div>
                    <div className="finding-content">
                      <div className="finding-title">
                        <strong>{titleCase(item.source)}</strong>
                        <span className="pill">
                          {titleCase(item.observation)}
                        </span>
                      </div>

                      <p>{item.message}</p>

                      <span className="finding-meta">
                        {item.id} · {item.router}
                        {item.link ? ` · ${item.link}` : ""}
                        {" · "}
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        <section id="incident-history" className="section-block">
          <div className="section-heading">
            <div>
              <h3>Incident history</h3>
              <p>Incidents defined in the selected demo scenario</p>
            </div>
            <span className="pill">{activeIncidents.length} active</span>
          </div>

          <div className="panel incident-history-panel">
            {incidents.length === 0 ? (
              <EmptyState
                icon={<Clock3 size={24} />}
                title="No incidents"
                message="There are no recorded incidents in this scenario."
              />
            ) : (
              incidents.map((incident, index) => (
                <div className="history-incident" key={incident.id || index}>
                  <div className="history-incident-header">
                    <div className="history-incident-title">
                      <strong>{incident.id || incident.incident_id}</strong>
                      <span>
                        {incident.title ||
                          incident.affected_link ||
                          incident.candidate_link}
                      </span>
                    </div>

                    <div className="history-incident-badges">
                      <span className="incident-status active">
                        {incident.status}
                      </span>
                      <span
                        className={`severity ${incident.severity?.toLowerCase()}`}
                      >
                        {incident.severity}
                      </span>
                    </div>
                  </div>

                  <p>{incident.description}</p>

                  <div className="history-incident-times">
                    <div>
                      <span>Detected at</span>
                      <strong>
                        {formatTime(
                          incident.detected_at || incident.first_detected_at,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Affected connection</span>
                      <strong>
                        {incident.affected_link ||
                          incident.candidate_link ||
                          "Unknown"}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="section-block router-section">
          <div className="section-heading">
            <div>
              <h3>Router inventory</h3>
              <p>Five-router virtual network</p>
            </div>
            <span className="pill">{routers.length} devices</span>
          </div>

          <div className="router-grid">
            {routers.map((router) => {
              const name = router.router.toUpperCase();
              const state = getRouterState(name);

              return (
                <div className="router-card" key={name}>
                  <div className="router-card-head">
                    <div className="router-icon">
                      <Router size={20} />
                    </div>
                    <span
                      className={`router-status ${
                        state === "healthy" ? "healthy" : "fault"
                      }`}
                    >
                      {state === "healthy" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <AlertTriangle size={14} />
                      )}
                      {titleCase(state)}
                    </span>
                  </div>

                  <h4>{name}</h4>
                  <p className="router-subtitle">FRRouting · BGP node</p>

                  <div className="router-details">
                    <span>
                      <Wifi size={14} />
                      Diagnostic findings
                    </span>
                    <strong>
                      {
                        findings.filter(
                          (item) => item.router?.toUpperCase() === name,
                        ).length
                      }
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {impact && (
          <section className="section-block">
            <div className="section-heading">
              <div>
                <h3>Impact analysis</h3>
                <p>Topology-based connectivity assessment</p>
              </div>
            </div>

            <div className="panel" style={{ padding: 24 }}>
              <p>{impact.message || "No impact information."}</p>

              <p style={{ marginTop: 12 }}>
                <strong>Physical links affected:</strong>{" "}
                {impact.affected_links?.join(", ") || "None"}
              </p>

              <p style={{ marginTop: 12 }}>
                <strong>BGP sessions affected:</strong>{" "}
                {impact.affected_bgp_sessions?.join(", ") || "Not specified"}
              </p>

              <p style={{ marginTop: 12 }}>
                <strong>Alternate topology path:</strong>{" "}
                {impact.alternate_path?.join(" → ") || "Not specified"}
              </p>

              <p style={{ marginTop: 12 }}>
                <strong>Topology components:</strong>{" "}
                {impact.connected_components
                  ?.map((component) => component.join(", "))
                  .join(" | ") || "Unknown"}
              </p>
            </div>
          </section>
        )}

        <footer className="footer">
          <span>
            <Activity size={14} />
            NETSCOPE · PS-035
          </span>
          <span>
            <Clock3 size={14} />
            Snapshot:{" "}
            {formatTime(
              diagnosis?.snapshot_timestamp || telemetry?.collected_at,
            )}
          </span>
          <span>DEMO · Simulated data</span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, detail, accent = "" }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${accent}`}>{icon}</div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

function RouterNode({ name, x, y, state }) {
  const healthy = state === "healthy";

  return (
    <div className="router-node" style={{ left: x, top: y }}>
      <div
        className={`node-circle ${
          state === "unknown" ? "unknown" : healthy ? "healthy" : "fault"
        }`}
      >
        <Router size={23} />
        <span className="node-dot" />
      </div>

      <strong>{name}</strong>
      <span>
        {state === "unknown"
          ? "No data"
          : healthy
            ? "No findings"
            : "Attention required"}
      </span>
    </div>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <div className="empty-state">
      <div>{icon}</div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

export default App;
