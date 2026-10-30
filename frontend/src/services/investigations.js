import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "./firebase.js";

export async function saveInvestigation(user, scenarioData) {
  if (!user?.uid || auth.currentUser?.uid !== user.uid) {
    throw new Error("Please log in to save investigations.");
  }

  if (
    !scenarioData ||
    typeof scenarioData !== "object" ||
    Array.isArray(scenarioData)
  ) {
    throw new Error("Invalid investigation data.");
  }

  const { scenario, telemetry, topology, diagnosis, evidence = [], incidents } =
    scenarioData;

  if (
    !scenario?.id ||
    !Array.isArray(telemetry?.routers) ||
    !Array.isArray(topology?.links) ||
    !Array.isArray(diagnosis?.findings) ||
    !Array.isArray(diagnosis?.candidate_root_causes) ||
    !Array.isArray(evidence) ||
    !Array.isArray(incidents)
  ) {
    throw new Error("Incomplete investigation snapshot.");
  }

  const source = scenario.mode === 'live' ? 'live' : 'demo';
  if (source === 'live' && (scenario.simulated !== false || scenarioData.provenance?.source !== 'live' || scenarioData.provenance?.kind !== 'backend_recorded_snapshot')) {
    throw new Error("Live provenance is required.");
  }
  // Serialize the full snapshot.
  // This preserves nested arrays that Firestore cannot
  // store directly inside array fields.
  const snapshotJson = JSON.stringify({
    scenario,
    telemetry,
    topology,
    diagnosis,
    evidence,
    incidents,
    ...(scenarioData.provenance ? { provenance: scenarioData.provenance } : {}),
    ...(scenarioData.investigation ? { investigation: scenarioData.investigation } : {}),
  });
  if (new TextEncoder().encode(snapshotJson).length > 800000) throw new Error("Investigation is too large to save safely.");

  const investigation = {
    source,
    scenarioId: scenario.id,
    title: scenario.name || scenario.title || scenario.id,
    status: "saved",

    snapshotVersion: 1,
    snapshotFormat: "json",

    findingsCount: diagnosis.findings.length,
    rootCausesCount: diagnosis.candidate_root_causes.length,
    evidenceCount: evidence.length,
    incidentsCount: incidents.length,

    snapshotJson,

    createdAt: serverTimestamp(),
  };

  try {
    const reference = await addDoc(
      collection(db, "users", user.uid, "investigations"),
      investigation,
    );

    return reference.id;
  } catch (error) {
    console.error("Firestore save error:", error.code, error.message);

    throw error;
  }
}
