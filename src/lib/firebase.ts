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

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

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

export const db: Firestore = createSafeFirestore(app);
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGooglePopup(): Promise<User> {
  // Call signInWithPopup synchronously without prior awaits so browser user gesture is preserved
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export function formatGoogleAuthError(err: unknown): string {
  const code = typeof (err as { code?: unknown })?.code === 'string'
    ? (err as { code: string }).code
    : '';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';

  if (code) {
    console.error('[Safar Google Auth Error]', code, err);
  }

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Google সাইন-ইন পপআপটি সম্পূর্ণ হওয়ার আগেই বন্ধ করা হয়েছে। আবার ক্লিক করে অ্যাকাউন্ট নির্বাচন করুন।';
    case 'auth/cancelled-popup-request':
      return 'আগের একটি সাইন-ইন পপআপ ইতিমধ্যে খোলা ছিল। দয়া করে আবার বাটনে ক্লিক করুন।';
    case 'auth/popup-blocked':
      return 'আপনার ব্রাউজার Google সাইন-ইন পপআপ আটকে দিয়েছে। অ্যাড্রেস বার থেকে Pop-ups Allow করে আবার ক্লিক করুন (অথবা অ্যাপটি নতুন ট্যাবে খুলুন)।';
    case 'auth/unauthorized-domain':
      return `এই ডোমেইনটি (${host || 'unknown'}) Firebase Auth-এ অনুমোদিত নয়।`;
    case 'auth/operation-not-allowed':
      return 'Firebase প্রজেক্টে Google Sign-In প্রোভাইডার সক্রিয় নেই।';
    case 'auth/network-request-failed':
      return 'ইন্টারনেট বা নেটওয়ার্ক সংযোগে সমস্যা হয়েছে। সংযোগ যাচাই করে আবার চেষ্টা করুন।';
    case 'auth/user-disabled':
      return 'এই Google অ্যাকাউন্টটি সাময়িকভাবে নিষ্ক্রিয় করা হয়েছে।';
    default:
      return 'Google সাইন-ইন সম্পন্ন করা যায়নি। ব্রাউজারে পপআপ অনুমতি Allow করে পুনরায় চেষ্টা করুন।';
  }
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export async function getAuthIdToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser;
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
  void auth.authStateReady().catch(() => {});
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
  path: string | null = null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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
