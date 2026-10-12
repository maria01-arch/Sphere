import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // Vercel/most env-var UIs mangle literal newlines in a multi-line value —
  // the private key is stored with escaped \n sequences, so they need to be
  // turned back into real newlines before the key is usable.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) return null

  return getApps().length ? getApp() : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

export function getAdminMessaging() {
  const app = getAdminApp()
  if (!app) return null
  return getMessaging(app)
}
