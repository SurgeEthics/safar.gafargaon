import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId,
};

function getOrCreateNamedApp(name?: string): FirebaseApp {
  if (!name) {
    return !getApps().length ? initializeApp(firebaseConfig) : getApp();
  }
  const existing = getApps().find((a) => a.name === name);
  return existing || initializeApp(firebaseConfig, name);
}

const app: FirebaseApp = getOrCreateNamedApp();
const driverApp: FirebaseApp = getOrCreateNamedApp('safar-driver');
const adminApp: FirebaseApp = getOrCreateNamedApp('safar-admin');

function createSafeFirestore(firebaseApp: FirebaseApp): Firestore {
  const dbId = firebaseConfig.firestoreDatabaseId;
  try {
    return initializeFirestore(
      firebaseApp,
      { experimentalAutoDetectLongPolling: true },
      dbId || undefined
    );
  } catch {
    try {
      return dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
    } catch {
      return getFirestore(firebaseApp);
    }
  }
}

function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

// 1. Passenger Session ([DEFAULT] Firebase App — Auth initialized before Firestore)
export const passengerApp: FirebaseApp = app;
export const auth: Auth = getAuth(app);
export const passengerAuth: Auth = auth;
export const db: Firestore = createSafeFirestore(app);
export const passengerDb: Firestore = db;
export const googleProvider = createGoogleProvider();

// 2. Driver Session (Isolated 'safar-driver' Firebase App — Auth initialized before Firestore)
export { driverApp };
export const driverAuth: Auth = getAuth(driverApp);
export const driverDb: Firestore = createSafeFirestore(driverApp);
const driverGoogleProvider = createGoogleProvider();

// 3. Admin Session (Isolated 'safar-admin' Firebase App — Auth initialized before Firestore)
export { adminApp };
export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = createSafeFirestore(adminApp);
const adminGoogleProvider = createGoogleProvider();

export async function ensureVerifiedAuthUser(
  targetAuth: Auth = passengerAuth,
  forceRefresh = false
): Promise<User | null> {
  try {
    await targetAuth.authStateReady();
  } catch {}
  const currentUser = targetAuth.currentUser;
  if (!currentUser) return null;
  if (!currentUser.emailVerified) {
    try {
      await currentUser.reload();
    } catch {}
    if (!currentUser.emailVerified) return null;
  }
  try {
    const tokenResult = await currentUser.getIdTokenResult(false).catch(() => null);
    const expMs = tokenResult?.expirationTime ? Date.parse(tokenResult.expirationTime) : 0;
    const isNearExpiry = !expMs || expMs - Date.now() < 60_000;
    await currentUser.getIdToken(forceRefresh || isNearExpiry);
  } catch {
    try {
      await currentUser.getIdToken(true);
    } catch {}
  }
  return currentUser;
}

export async function signInWithPassengerGooglePopup(): Promise<User> {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  // Call signInWithPopup synchronously without prior awaits so browser user gesture is preserved
  const result = await signInWithPopup(passengerAuth, googleProvider);
  await result.user.getIdToken(true).catch(() => {});
  return result.user;
}

export async function signInWithDriverGooglePopup(): Promise<User> {
  driverGoogleProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(driverAuth, driverGoogleProvider);
  await result.user.getIdToken(true).catch(() => {});
  return result.user;
}

export async function signInWithAdminGooglePopup(): Promise<User> {
  adminGoogleProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(adminAuth, adminGoogleProvider);
  await result.user.getIdToken(true).catch(() => {});
  return result.user;
}

export async function signInWithGooglePopup(): Promise<User> {
  return signInWithPassengerGooglePopup();
}

export function isFirebaseAuthError(err: unknown): boolean {
  const code = typeof (err as { code?: unknown })?.code === 'string'
    ? (err as { code: string }).code
    : '';
  return code.startsWith('auth/');
}

export function formatGoogleAuthError(err: unknown): string {
  const code = typeof (err as { code?: unknown })?.code === 'string'
    ? (err as { code: string }).code
    : '';
  const message = typeof (err as { message?: unknown })?.message === 'string'
    ? (err as { message: string }).message
    : '';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';

  if (code || message) {
    console.error('[Safar Google Auth Error]', code, message, err);
  }

  // Detect Google Cloud API Key HTTP Referrer restriction blocks
  if (
    message.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
    message.includes('requests-from-referer') ||
    code.includes('requests-from-referer')
  ) {
    return `Google Cloud API Key রেস্ট্রিকশনে এই ডোমেইন (${host || 'unknown'}) অনুমোদিত নয়। অনুগ্রহ করে Google Cloud Credentials-এ "${host ? `https://${host}/*` : 'বর্তমান ডোমেইন'}" এবং "https://gen-lang-client-0494218293.firebaseapp.com/*" যোগ করুন।`;
  }

  if (code === 'auth/api-key-not-valid' || message.includes('api-key-not-valid')) {
    return 'Firebase API Key সঠিক নয় বা Google Cloud-এ সীমাবদ্ধ রয়েছে।';
  }

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Google সাইন-ইন পপআপটি সম্পূর্ণ হওয়ার আগেই বন্ধ করা হয়েছে। আবার ক্লিক করে অ্যাকাউন্ট নির্বাচন করুন।';
    case 'auth/cancelled-popup-request':
      return 'আগের একটি সাইন-ইন পপআপ ইতিমধ্যে খোলা ছিল। দয়া করে আবার বাটনে ক্লিক করুন।';
    case 'auth/popup-blocked':
      return 'আপনার ব্রাউজার Google সাইন-ইন পপআপ আটকে দিয়েছে। অ্যাড্রেস বার থেকে Pop-ups Allow করে আবার ক্লিক করুন (অথবা অ্যাপটি নতুন ট্যাবে খুলুন)।';
    case 'auth/unauthorized-domain':
      return `এই ডোমেইনটি (${host || 'unknown'}) Firebase Auth-এ অনুমোদিত নয়। Firebase Console → Authentication → Settings → Authorized domains-এ যুক্ত করুন।`;
    case 'auth/operation-not-allowed':
      return 'Firebase প্রজেক্টে Google Sign-In প্রোভাইডার সক্রিয় নেই।';
    case 'auth/network-request-failed':
      return 'ইন্টারনেট বা নেটওয়ার্ক সংযোগে সমস্যা হয়েছে। সংযোগ যাচাই করে আবার চেষ্টা করুন।';
    case 'auth/user-disabled':
      return 'এই Google অ্যাকাউন্টটি সাময়িকভাবে নিষ্ক্রিয় করা হয়েছে।';
    case 'auth/web-storage-unsupported':
      return 'আপনার ব্রাউজারে Cookies বা Web Storage বন্ধ রয়েছে। ব্রাউজার সেটিংস থেকে Cookies চালু করে আবার চেষ্টা করুন।';
    case 'auth/account-exists-with-different-credential':
      return 'এই ইমেইলটি অন্য একটি সাইন-ইন পদ্ধতির সাথে যুক্ত রয়েছে।';
    case 'auth/internal-error':
      return `Google সাইন-ইন সম্পন্ন করা যায়নি (auth/internal-error)। ব্রাউজারে থার্ড-পার্টি কুকি/পপআপ Allow করুন অথবা অ্যাপটি সরাসরি নতুন ট্যাবে খুলে চেষ্টা করুন।`;
    default:
      if (code && !code.startsWith('auth/')) {
        return `ডেটাবেজ সিঙ্ক ত্রুটি (${code})। অনুগ্রহ করে পুনরায় চেষ্টা করুন।`;
      }
      return `Google সাইন-ইন সম্পন্ন করা যায়নি${code ? ` (${code})` : ''}। ব্রাউজারে পপআপ অনুমতি Allow করে পুনরায় চেষ্টা করুন।`;
  }
}

export async function signOutPassengerFirebase(): Promise<void> {
  await signOut(passengerAuth);
}

export async function signOutDriverFirebase(): Promise<void> {
  await signOut(driverAuth);
}

export async function signOutAdminFirebase(): Promise<void> {
  await signOut(adminAuth);
}

export async function signOutFirebase(): Promise<void> {
  await signOutPassengerFirebase();
}

export async function getAuthIdToken(forceRefresh = false, targetAuth: Auth = passengerAuth): Promise<string | null> {
  const currentUser = targetAuth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (typeof window !== 'undefined') {
  void passengerAuth.authStateReady().catch(() => {});
  void driverAuth.authStateReady().catch(() => {});
  void adminAuth.authStateReady().catch(() => {});
  void testConnection();
}

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write' | 'read';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null = null,
  targetAuth: Auth = passengerAuth
) {
  const currentUser = targetAuth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

export function handleDriverFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null = null
) {
  return handleFirestoreError(error, operationType, path, driverAuth);
}

export function handleAdminFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null = null
) {
  return handleFirestoreError(error, operationType, path, adminAuth);
}
