import { initializeApp } from 'firebase/app';
import {
	getAuth,
	GoogleAuthProvider,
	FacebookAuthProvider,
	signInWithPopup,
	signOut,
	linkWithCredential,
	fetchSignInMethodsForEmail,
	OAuthCredential,
	type UserCredential,
	type AuthError,
} from 'firebase/auth';

// Firebase configuration - replace with your Firebase project config
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
	appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

/**
 * Sign in with Google using Firebase
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
	return signInWithPopup(auth, googleProvider);
};

/**
 * Sign in with Facebook using Firebase
 */
export const signInWithFacebook = async (): Promise<UserCredential> => {
	return signInWithPopup(auth, facebookProvider);
};

/**
 * Get Firebase ID token for the current user
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
	const user = auth.currentUser;
	if (!user) return null;
	return user.getIdToken();
};

/**
 * Sign out from Firebase
 */
export const firebaseSignOut = async (): Promise<void> => {
	return signOut(auth);
};

/**
 * Get sign-in methods for an email
 */
export const getSignInMethodsForEmail = async (email: string): Promise<string[]> => {
	return fetchSignInMethodsForEmail(auth, email);
};

/**
 * Link a pending credential to the current user
 */
export const linkPendingCredential = async (
	credential: OAuthCredential,
): Promise<UserCredential | null> => {
	const user = auth.currentUser;
	if (!user || !credential) return null;
	return linkWithCredential(user, credential);
};

/**
 * Get provider name for display
 */
export const getProviderDisplayName = (providerId: string): string => {
	switch (providerId) {
		case 'google.com':
			return 'Google';
		case 'facebook.com':
			return 'Facebook';
		case 'apple.com':
			return 'Apple';
		case 'password':
			return 'Email/Password';
		default:
			return providerId;
	}
};

/**
 * Check if error is account-exists-with-different-credential
 */
export const isCredentialConflictError = (error: unknown): error is AuthError => {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as AuthError).code === 'auth/account-exists-with-different-credential'
	);
};

/**
 * Extract credential from Firebase error
 */
export const getCredentialFromError = (error: AuthError): OAuthCredential | null => {
	const customData = error.customData as { _tokenResponse?: { oauthAccessToken?: string } };
	if (customData?._tokenResponse?.oauthAccessToken) {
		return FacebookAuthProvider.credential(customData._tokenResponse.oauthAccessToken);
	}
	return null;
};

export { auth, GoogleAuthProvider, FacebookAuthProvider };
export type { OAuthCredential, AuthError };
export default app;
