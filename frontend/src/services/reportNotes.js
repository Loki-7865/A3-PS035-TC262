import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase.js';
export async function saveReportNotes(uid, id, notes) {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error('Sign in again before saving notes.');
  if (typeof id !== 'string' || !id || id.includes('/')) throw new Error('Invalid investigation ID.');
  if (typeof notes !== 'string' || notes.length > 10000) throw new Error('Notes must be at most 10,000 characters.');
  await updateDoc(doc(db,'users',uid,'investigations',id), {notes, notesUpdatedAt:serverTimestamp()});
}
