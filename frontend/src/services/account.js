import { updateProfile, reload, sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, reauthenticateWithPopup, EmailAuthProvider, GoogleAuthProvider, deleteUser } from 'firebase/auth';
import { collection, query, limit, getDocsFromServer, doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase.js';

export function accountProviders(user) {
  const providers = new Set((user?.providerData || []).map(item=>item.providerId));
  return {password:providers.has('password'), google:providers.has('google.com')};
}
function owner(user) {
  if (!user?.uid || auth.currentUser?.uid !== user.uid) throw new Error('Your session changed. Sign in again.');
  return user;
}
export function accountError(error) {
  const messages = {
    'auth/requires-recent-login':'Please verify your identity again and retry.',
    'auth/invalid-credential':'Identity verification failed. Check your current password.',
    'auth/wrong-password':'Identity verification failed. Check your current password.',
    'auth/user-mismatch':'Use the same account to verify your identity.',
    'auth/popup-closed-by-user':'Google verification was cancelled. No change was made.',
    'auth/popup-blocked':'Allow the Google sign-in popup, then try again.',
    'auth/too-many-requests':'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed':'Unable to connect. Check your connection and retry.',
    'auth/weak-password':'The new password does not meet the project password policy.',
    'auth/password-does-not-meet-requirements':'The new password does not meet the project password policy.',
    'auth/invalid-email':'Enter a valid email address.',
    'permission-denied':'Access denied. No account deletion was performed.',
    'unavailable':'The service is unavailable. Try again when online.',
  };
  return messages[error?.code] || (error?.accountValidation ? error.message : 'Unable to complete this action. Please sign in again or retry.');
}
function invalid(message) { throw Object.assign(new Error(message),{accountValidation:true}); }
export async function saveAccountProfile(user, displayName, removePhoto=false) {
  owner(user);
  const name=displayName.trim();
  if (!name || name.length>80) invalid('Display name must contain 1–80 characters.');
  await updateProfile(user,{displayName:name,...(removePhoto?{photoURL:null}:{})});
  owner(user);
}
export async function refreshAccount(user) { await reload(owner(user));owner(user); }
export async function verifyEmail(user) {
  owner(user);
  if (!user.email || user.emailVerified) invalid('This account does not need an email verification message.');
  await sendEmailVerification(user);
}
export async function resetAccountPassword(email) {
  const address=email.trim();
  if (!address || address.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) invalid('Enter a valid email address.');
  try {await sendPasswordResetEmail(auth,address);}
  catch(error) {if(error.code!=='auth/user-not-found')throw error;}
}
export async function reauthenticateAccount(user, method, password='') {
  owner(user);
  const providers=accountProviders(user);
  if(method==='password' && providers.password) {
    if(!password)invalid('Enter your current password.');
    await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,password));
  } else if(method==='google' && providers.google) {
    await reauthenticateWithPopup(user,new GoogleAuthProvider());
  } else invalid('This sign-in provider is not supported for this action.');
  owner(user);
}
export async function changeAccountPassword(user,currentPassword,newPassword,confirmation) {
  owner(user);
  if(!accountProviders(user).password)invalid('Manage your password through your sign-in provider.');
  if(newPassword!==confirmation)invalid('New passwords do not match.');
  if(newPassword.length<6 || newPassword.length>128)invalid('Use a password between 6 and 128 characters; the project may require more.');
  await reauthenticateAccount(user,'password',currentPassword);
  await updatePassword(owner(user),newPassword);
}
export async function deleteEmptyAccount(user,{confirmation,method,password}) {
  owner(user);
  if(confirmation!=='DELETE')invalid('Type DELETE to confirm account deletion.');
  await reauthenticateAccount(user,method,password);
  // Server reads are required: an empty offline cache is not proof of an empty account.
  const investigations=await getDocsFromServer(query(collection(db,'users',user.uid,'investigations'),limit(1)));
  owner(user);
  if(!investigations.empty)invalid('Saved investigations remain. Export and delete them in My Investigations before deleting your account.');
  const profile=await getDocFromServer(doc(db,'users',user.uid));
  owner(user);
  if(profile.exists())invalid('Workspace profile data remains. Contact the project operator for cleanup before deleting your account.');
  await deleteUser(owner(user));
}
