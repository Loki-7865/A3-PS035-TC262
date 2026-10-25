import { collection, getCountFromServer, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "./firebase.js";

function workspace() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in to view your workspace.");
  return { uid, reference: collection(db, "users", uid, "investigations") };
}
export async function loadWorkspaceCounts() {
  const { uid, reference } = workspace();
  const [total, demo, live] = await Promise.all([
    getCountFromServer(reference),
    getCountFromServer(query(reference, where("source", "==", "demo"))),
    getCountFromServer(query(reference, where("source", "==", "live"))),
  ]);
  if (auth.currentUser?.uid !== uid) throw new Error("Your session changed. Refresh your workspace.");
  return { total: total.data().count, demo: demo.data().count, live: live.data().count, checkedAt: new Date() };
}
export function subscribeRecentInvestigations(onRecords, onError) {
  const { uid, reference } = workspace();
  return onSnapshot(query(reference, orderBy("createdAt", "desc"), limit(5)), { includeMetadataChanges: true }, (snapshot) => {
    if (auth.currentUser?.uid !== uid) return;
    onRecords({
      records: snapshot.docs.map((item) => ({ ...item.data(), id: item.id })),
      cached: snapshot.metadata.fromCache,
    });
  }, (error) => { if (auth.currentUser?.uid === uid) onError(error); });
}
