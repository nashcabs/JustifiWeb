import {
  initializeApp,
  getApp,
  getApps
} from 'firebase/app';

import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firebase configuration for the new JustiFi project.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyC4z0VH0qlD2Fqn2QhzCE8D7mo0AdRoHvM',
  authDomain: 'justifi-4a327.firebaseapp.com',
  projectId: 'justifi-4a327',
  storageBucket: 'justifi-4a327.firebasestorage.app',
  messagingSenderId: '192148448547',
  appId: '1:192148448547:web:7cba616681b51013d29896',
  measurementId: 'G-DNXHWJW29B'
};

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
export const storage = getStorage(firebaseApp);

export default firebaseApp;