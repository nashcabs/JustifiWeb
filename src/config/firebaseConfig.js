// Firebase config.
// Read values from Vite environment variables so secrets are not hardcoded.

function getFirebaseEnv(name, { required = true } = {}) {
  const value = import.meta.env[name];

  if (required && (!value || value === '')) {
    throw new Error(`Missing required Firebase environment variable: ${name}`);
  }

  return value;
}

const measurementId = getFirebaseEnv('VITE_FIREBASE_MEASUREMENT_ID', { required: false });

export const firebaseConfig = {
  apiKey: getFirebaseEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getFirebaseEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getFirebaseEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getFirebaseEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getFirebaseEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getFirebaseEnv('VITE_FIREBASE_APP_ID'),
  ...(measurementId ? { measurementId } : {})
};

export default firebaseConfig;
