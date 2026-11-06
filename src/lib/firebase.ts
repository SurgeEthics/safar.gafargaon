import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB9QBWTvZf80SsnpUSr696n2LHMEuapYnk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0494218293.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0494218293",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0494218293.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "82484299106",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:82484299106:web:750db75836f2bf2cf2583b",
  firestoreDatabaseId: import.meta.env.VITE_FIRESTORE_DATABASE_ID || "ai-studio-7814ff46-1dfd-47a1-888d-f516713fcbb9"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'list';

export function handleFirestoreError(error: unknown, operation: OperationType, path?: string) {
  console.warn(`Firestore ${operation} warning on ${path || 'collection'}:`, error);
}
