import {
  initializeApp,
  getApp,
  getApps
} from 'firebase/app';

import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../config/firebaseConfig.js';

/**
 * Prevents Firebase from being initialized more than once
 * during React development and Vite hot reloads.
 */
export function getFirebaseApp() {
  return getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);
}

/**
 * Main Firebase application instance.
 */
export const firebaseApp = getFirebaseApp();

/**
 * Firebase services used by JustiFi.
 */
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export async function getFirebaseStorage() {
  const { getStorage } = await import('firebase/storage');
  return getStorage(firebaseApp);
}

export default firebaseApp;