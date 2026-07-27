import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function getFirebaseApp() {
  if (!firebaseConfig.apiKey) return null
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

// Wrapped in isSupported() because Firebase Messaging itself throws in
// browsers/contexts without the right APIs (same PushManager/ServiceWorker
// requirements as before) — this lets callers just get `null` back instead
// of a thrown error to handle.
export async function getFirebaseMessaging() {
  const app = getFirebaseApp()
  if (!app) return null
  if (!(await isSupported())) return null
  return getMessaging(app)
}
