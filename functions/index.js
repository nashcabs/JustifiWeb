import admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const deleteUserAccountByAdmin = onCall(async (request) => {
  const targetUid = String(request.data?.uid || '').trim();
  const authContext = request.auth;

  if (!authContext) {
    throw new HttpsError('unauthenticated', 'You must be signed in to delete an account.');
  }

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'A target uid is required.');
  }

  const callerUid = authContext.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerRole = String(callerDoc.data()?.role || '').trim().toLowerCase();

  if (callerRole !== 'developer') {
    throw new HttpsError('permission-denied', 'Only developers can delete user accounts.');
  }

  if (callerUid === targetUid) {
    throw new HttpsError('failed-precondition', 'You cannot delete your own account.');
  }

  await admin.auth().deleteUser(targetUid);
  await admin.firestore().collection('users').doc(targetUid).delete();

  return {
    success: true,
    message: `Deleted Firebase Auth user and Firestore profile for uid ${targetUid}.`
  };
});
