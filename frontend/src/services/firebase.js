import { getFirestore } from "firebase/firestore";
import app from "./firebaseAuth.js";

// Keep the database SDK behind route imports; authentication stays in the app shell.
export { auth, googleProvider, default } from "./firebaseAuth.js";
export const db = getFirestore(app);
