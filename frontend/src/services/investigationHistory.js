import { collection, deleteDoc, doc, documentId, getDocs, limit, orderBy, query, startAfter } from "firebase/firestore";
import { auth, db } from "./firebase.js";

export const HISTORY_BATCH_SIZE = 25;
function ownerId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in to manage investigations.");
  return uid;
}
export async function loadInvestigationBatch(cursor = null) {
  const uid = ownerId();
  // Document ID order includes legacy records without createdAt. Sort loaded history in the UI.
  const constraints = [orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(HISTORY_BATCH_SIZE)];
  const result = await getDocs(query(collection(db, "users", uid, "investigations"), ...constraints));
  if (auth.currentUser?.uid !== uid) throw new Error("Your session changed. Please reload.");
  return {
    records: result.docs.map((item) => ({ ...item.data(), id: item.id })),
    cursor: result.docs.at(-1) || cursor,
    hasMore: result.size === HISTORY_BATCH_SIZE,
  };
}
export async function deleteInvestigation(id) {
  const uid = ownerId();
  if (typeof id !== "string" || !id || id.includes("/")) throw new Error("Invalid investigation ID.");
  await deleteDoc(doc(db, "users", uid, "investigations", id));
}
export function historyError(error) {
  if (error?.code === "permission-denied") return "Access denied. Your account does not have permission to perform this action.";
  if (error?.code === "unavailable") return "The service is unavailable. Check your connection and try again.";
  return "Unable to complete this action. Please try again.";
}
