
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
} from "lucide-react";
import "./App.css";

const API = "/api";

const LINKS = [
  { id: "R1-R2", subnet: "10.0.12.0/30" },
  { id: "R1-R3", subnet: "10.0.13.0/30" },
  { id: "R2-R4", subnet: "10.0.24.0/30" },
  { id: "R3-R4", subnet: "10.0.34.0/30" },
  { id: "R4-R5", subnet: "10.0.45.0/30" },
];

function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  // Collect fresh telemetry and update the dashboard.
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Step 1: Trigger a fresh collection and diagnosis on the backend.
      const refreshResponse = await fetch(`${API}/refresh`, {
        method: "POST",
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Telemetry refresh failed (HTTP ${refreshResponse.status}).`
        );
      }

      const diagnosisData = await refreshResponse.json();

      // Step 2: Load the saved telemetry and check API connectivity.
      const [healthResponse, telemetryResponse] = await Promise.all([
        fetch(`${API}/health`),
        fetch(`${API}/telemetry`),
      ]);

      if (!healthResponse.ok || !telemetryResponse.ok) {
        throw new Error(
          "Telemetry was collected, but dashboard data could not be loaded."
        );
      }

      const [healthData, telemetryData] = await Promise.all([
        healthResponse.json(),
        telemetryResponse.json(),
      ]);

      // Step 3: Update the UI only after receiving the required responses.
      setApiOnline(healthData.status === "ok");
      setTelemetry(telemetryData);
      setDiagnosis(diagnosisData);
      setLastRefresh(new Date());

      // Report partial collection failures instead of implying full health.
      const collection = diagnosisData.collection;

      if (
        collection &&
        collection.routers_ok < collection.routers_total
      ) {
        setError(
          `Telemetry collected from ${collection.routers_ok} of ${collection.routers_total} routers. Check the router collection status.`
        );
      }
    } catch (err) {
      setError(err.message || "Could not refresh network telemetry.");
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial page load also performs a live refresh.
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const routers = telemetry?.routers ?? [];
  const findings = diagnosis?.findings ?? [];
  const rootCauses = diagnosis?.candidate_root_causes ?? [];
  const impactAnalysis = diagnosis?.impact_analysis;
const affectedLinks = impactAnalysis?.affected_links ?? [];
const connectedComponents = impactAnalysis?.connected_components ?? [];

  const routerName = (router) =>
    (router?.router ?? "unknown").toUpperCase();

  const routerFindings = (name) =>
    findings.filter((item) => item.router?.toUpperCase() === name);

  const isHealthy = (name) => {
    const router = routers.find(
      (item) => routerName(item) === name
    );

    // Missing or failed telemetry must not be reported as healthy.
    if (!router || !router.healthy_collection) return false;

    return routerFindings(name).length === 0;
  };

  const linkHasFault = (id) =>
    rootCauses.some((cause) => cause.candidate_link === id);

  const formatTime = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  };

  const healthyRouterCount = routers.filter((router) => {
    const name = routerName(router);
    return isHealthy(name);
  }).length;

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
            <Activity size={18} />
            Overview
          </a>

          <a className="nav-item" href="#topology">
            <GitBranch size={18} />
            Network topology
          </a>

          <a className="nav-item" href="#diagnostics">
            <ShieldAlert size={18} />
            Diagnostics

            {findings.length > 0 && (
              <span className="nav-count">{findings.length}</span>
            )}
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-indicator">
            <span
              className={`status-dot ${apiOnline ? "online" : ""}`}
            />

            <div>
              <strong>Backend API</strong>
              <span>
                {apiOnline ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          <p>AIORI-3 · PS-035</p>
          <p>Intelligent Network Fault Diagnosis</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              NETWORK OPERATIONS CENTER
            </div>

            <h2>Network Overview</h2>

            <p>
              Monitor routing health and investigate network faults.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "spin" : ""}
            />

            {loading ? "Refreshing..." : "Refresh data"}
          </button>
        </header>

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
            detail="Configured network devices"
          />

          <StatCard
            icon={<CheckCircle2 size={19} />}
            label="HEALTHY ROUTERS"
            value={healthyRouterCount}
            detail="Collection successful, no detected BGP findings"
            accent="green"
          />

          <StatCard
            icon={<AlertTriangle size={19} />}
            label="ACTIVE FINDINGS"
            value={findings.length}
            detail="From latest diagnosis"
            accent={findings.length ? "red" : "green"}
          />

          
<StatCard
  icon={<GitBranch size={19} />}
  label="CORRELATED INCIDENTS"
  value={rootCauses.length}
  detail={`${findings.length} individual findings`}
  accent={rootCauses.length ? "amber" : "green"}
/>

        </section>

        <section id="topology" className="section-block">
          <div className="section-heading">
            <div>
              <h3>Network topology</h3>
              <p>Five-router BGP test network</p>
            </div>

            <div className="legend">
              <span>
                <i className="legend-green" />
                No detected finding
              </span>

              <span>
                <i className="legend-red" />
                Suspected fault
              </span>
            </div>
          </div>

          <div className="topology-card">
            <div className="topology-canvas">
              <svg
                className="topology-lines"
                viewBox="0 0 700 300"
                preserveAspectRatio="none"
                aria-label="Five-router network connections"
              >
                <line
                  x1="115"
                  y1="75"
                  x2="340"
                  y2="75"
                  className={
                    linkHasFault("R1-R2") ? "fault" : "healthy"
                  }
                />

                <line
                  x1="115"
                  y1="75"
                  x2="115"
                  y2="225"
                  className={
                    linkHasFault("R1-R3") ? "fault" : "healthy"
                  }
                />

                <line
                  x1="340"
                  y1="75"
                  x2="560"
                  y2="150"
                  className={
                    linkHasFault("R2-R4") ? "fault" : "healthy"
                  }
                />

                <line
                  x1="115"
                  y1="225"
                  x2="560"
                  y2="150"
                  className={
                    linkHasFault("R3-R4") ? "fault" : "healthy"
                  }
                />

                <line
                  x1="560"
                  y1="150"
                  x2="560"
                  y2="225"
                  className={
                    linkHasFault("R4-R5") ? "fault" : "healthy"
                  }
                />
              </svg>

              <RouterNode
                name="R1"
                x="16.4%"
                y="25%"
                routers={routers}
                healthy={isHealthy("R1")}
              />

              <RouterNode
                name="R2"
                x="48.6%"
                y="25%"
                routers={routers}
                healthy={isHealthy("R2")}
              />

              <RouterNode
                name="R3"
                x="16.4%"
                y="75%"
                routers={routers}
                healthy={isHealthy("R3")}
              />

              <RouterNode
                name="R4"
                x="80%"
                y="50%"
                routers={routers}
                healthy={isHealthy("R4")}
              />

              <RouterNode
                name="R5"
                x="80%"
                y="75%"
                routers={routers}
                healthy={isHealthy("R5")}
              />
            </div>

            <div className="link-list">
              {LINKS.map((link) => {
                const fault = linkHasFault(link.id);

                return (
                  <div className="link-chip" key={link.id}>
                    <span
                      className={`link-indicator ${
                        fault ? "fault" : "healthy"
                      }`}
                    />

                    <strong>{link.id}</strong>
                    <span>{link.subnet}</span>

                    <span
                      className={`state-label ${
                        fault ? "fault" : ""
                      }`}
                    >
                      {fault ? "Suspected fault" : "No finding"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="disclaimer">
              Link states are inferred from BGP findings and do not
              independently confirm physical link health.
            </p>
          </div>
        </section>

        <section className="lower-grid">
          <div id="diagnostics" className="section-block">
            <div className="section-heading">
              <div>
                <h3>Fault diagnostics</h3>
                <p>Findings from BGP analysis</p>
              </div>

              <span className="pill">
                {findings.length} findings
              </span>
            </div>

            <div className="panel">
              {findings.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={24} />}
                  title="No findings in this snapshot"
                  message="No BGP findings were detected in the latest diagnosis."
                />
              ) : (
                findings.map((finding, index) => (
                  <div
                    className="finding-row"
                    key={`${finding.router}-${finding.neighbor}-${index}`}
                  >
                    <div className="finding-icon">
                      <ShieldAlert size={19} />
                    </div>

                    <div className="finding-content">
                      <div className="finding-title">
                        <strong>
                          {finding.type?.replaceAll("_", " ")}
                        </strong>

                        <span
                          className={`severity ${finding.severity?.toLowerCase()}`}
                        >
                          {finding.severity}
                        </span>
                      </div>

                      <p>{finding.message}</p>

                      <span className="finding-meta">
                        {finding.router}
                        {finding.neighbor
                          ? ` · Neighbor ${finding.neighbor}`
                          : ""}
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
                <p>Correlated topology evidence</p>
              </div>
            </div>

            <div className="panel">
              {rootCauses.length === 0 ? (
                <EmptyState
                  icon={<GitBranch size={24} />}
                  title="No candidate links"
                  message="Correlated link candidates appear when BGP findings are detected."
                />
              ) : (
                
rootCauses.map((cause, index) => (
  <div
    className="root-cause"
    key={`${cause.candidate_link}-${index}`}
  >
    <div className="root-cause-top">
      <div className="root-cause-icon">
        <GitBranch size={19} />
      </div>

      <div>
        <strong>{cause.candidate_link}</strong>
        <span>{cause.subnet}</span>
      </div>

      <span
        className={`severity ${cause.severity?.toLowerCase()}`}
      >
        {cause.severity}
      </span>
    </div>

    <div className="incident-summary">
      <strong>Correlated BGP incident</strong>
      <p>
        {cause.observation_count ??
          cause.observations?.length ??
          1}{" "}
        observation(s) across{" "}
        {cause.affected_routers?.length ?? 1} router(s)
      </p>
    </div>

    <div className="incident-routers">
      {(cause.affected_routers ?? []).map((router) => (
        <span className="incident-router" key={router}>
          <Router size={13} />
          {router}
        </span>
      ))}
    </div>

    <div className="incident-evidence">
      <strong>Diagnostic evidence</strong>

      {cause.observations?.length ? (
        cause.observations.map((observation, observationIndex) => (
          <div
            className="observation-row"
            key={`${observation.router}-${observation.neighbor}-${observationIndex}`}
          >
            <div className="observation-heading">
              <span>{observation.router}</span>

              <span
                className={`severity ${observation.severity?.toLowerCase()}`}
              >
                {observation.severity}
              </span>
            </div>

            <p>{observation.message}</p>

            {observation.neighbor && (
              <span className="finding-meta">
                Neighbor: {observation.neighbor}
              </span>
            )}
          </div>
        ))
      ) : (
        <p>{cause.evidence}</p>
      )}
    </div>

    <div className="evidence-note">
      <AlertTriangle size={15} />
      {cause.assessment}
    </div>
  </div>
))

              )}
            </div>
          </div>
        </section>

        <section id="impact-analysis" className="section-block">
          <div className="section-heading">
            <div>
              <h3>Network impact analysis</h3>
              <p>Topology-based assessment of suspected link failures</p>
            </div>
            <span className="pill">
              {impactAnalysis?.analysis_type === "TOPOLOGY_BASED_ESTIMATE"
                ? "Topology estimate"
                : "Awaiting analysis"}
            </span>
          </div>

          <div className="impact-grid">
            <div className="panel impact-overview">
              <div className="impact-metric">
                <span>CONNECTED COMPONENTS</span>
                <strong>{connectedComponents.length}</strong>
              </div>
              <p>
                {connectedComponents.length === 1
                  ? "The configured topology remains connected under the assumed failures."
                  : connectedComponents.length > 1
                    ? "The assumed failures divide the topology into disconnected groups."
                    : "Refresh telemetry to calculate network connectivity."}
              </p>

              <div className="component-list">
                {connectedComponents.map((component, index) => (
                  <div className="component-row" key={index}>
                    <span>Group {index + 1}</span>
                    <div className="incident-routers">
                      {component.map((router) => (
                        <span className="incident-router" key={router}>
                          <Router size={13} />
                          {router}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel impact-links">
              {affectedLinks.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={24} />}
                  title="No suspected links to assess"
                  message="Impact details will appear when root-cause candidates are detected."
                />
              ) : (
                affectedLinks.map((link) => (
                  <div className="impact-link-row" key={link.link}>
                    <div className="impact-link-heading">
                      <div>
                        <strong>{link.link}</strong>
                        <span>{link.subnet}</span>
                      </div>
                      <span
                        className={`impact-status ${
                          link.alternate_path_exists ? "available" : "risk"
                        }`}
                      >
                        {link.alternate_path_exists
                          ? "Alternate path"
                          : "Partition risk"}
                      </span>
                    </div>
                    <p>{link.assessment}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {impactAnalysis?.limitations && (
            <p className="disclaimer impact-disclaimer">
              <AlertTriangle size={13} />
              {impactAnalysis.limitations}
            </p>
          )}
        </section>

        <section className="section-block router-section">
          <div className="section-heading">
            <div>
              <h3>Router inventory</h3>
              <p>Collected device information</p>
            </div>

            <span className="pill">
              {routers.length} devices
            </span>
          </div>

          <div className="router-grid">
            {routers.map((router) => {
              const name = routerName(router);
              const healthy = isHealthy(name);

              return (
                <div className="router-card" key={name}>
                  <div className="router-card-head">
                    <div className="router-icon">
                      <Router size={20} />
                    </div>

                    <span
                      className={`router-status ${
                        healthy ? "healthy" : "fault"
                      }`}
                    >
                      {healthy ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <AlertTriangle size={14} />
                      )}

                      {!router.healthy_collection
                        ? "Collection issue"
                        : healthy
                          ? "No findings"
                          : "Alert"}
                    </span>
                  </div>

                  <h4>{name}</h4>
                  <p className="router-subtitle">BGP routing node</p>

                  <div className="router-details">
                    <span>
                      <Wifi size={14} />
                      BGP analysis
                    </span>

                    <strong>
                      {routerFindings(name).length} findings
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="footer">
          <span>
            <Activity size={14} />
            NETSCOPE · PS-035
          </span>

          <span>
            <Clock3 size={14} />
            Snapshot:{" "}
            {formatTime(
              diagnosis?.snapshot_timestamp ||
                telemetry?.collected_at
            )}
          </span>

          <span>
            {loading
              ? "Refreshing telemetry..."
              : apiOnline
                ? "API connected"
                : "API disconnected"}
          </span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  accent = "",
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${accent}`}>{icon}</div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

function RouterNode({ name, x, y, routers, healthy }) {
  const found = routers.some(
    (router) => (router.router ?? "").toUpperCase() === name
  );

  const routerData = routers.find(
    (router) => (router.router ?? "").toUpperCase() === name
  );

  const collectionOk = routerData?.healthy_collection === true;
  const nodeHealthy = found && collectionOk && healthy;

  return (
    <div className="router-node" style={{ left: x, top: y }}>
      <div
        className={`node-circle ${
          !found
            ? "unknown"
            : nodeHealthy
              ? "healthy"
              : "fault"
        }`}
      >
        <Router size={23} />
        <span className="node-dot" />
      </div>

      <strong>{name}</strong>

      <span>
        {!found
          ? "No data"
          : !collectionOk
            ? "Collection issue"
            : nodeHealthy
              ? "No findings"
              : "Alert detected"}
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
