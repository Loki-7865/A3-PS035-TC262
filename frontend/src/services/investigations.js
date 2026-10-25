import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "./firebase.js";

export async function saveInvestigation(user, scenarioData) {
  if (!user?.uid) {
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
  });

  const investigation = {
    source: "demo",
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
