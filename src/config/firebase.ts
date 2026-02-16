import * as admin from 'firebase-admin';
import { config } from '@/config';
import { logger } from '@/utils/logger';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebase = (): admin.app.App | null => {
	if (firebaseApp) {
		return firebaseApp;
	}

	if (!config.features.firebaseAuth) {
		logger.info('Firebase Auth is disabled');
		return null;
	}

	if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
		logger.warn('Firebase configuration is incomplete, Firebase Auth will not work');
		return null;
	}

	try {
		firebaseApp = admin.initializeApp({
			credential: admin.credential.cert({
				projectId: config.firebase.projectId,
				clientEmail: config.firebase.clientEmail,
				privateKey: config.firebase.privateKey,
			}),
		});

		logger.info('Firebase Admin SDK initialized successfully');
		return firebaseApp;
	} catch (error) {
		logger.error('Failed to initialize Firebase Admin SDK:', error);
		return null;
	}
};

/**
 * Verify Firebase ID Token
 */
export const verifyFirebaseToken = async (
	idToken: string,
): Promise<admin.auth.DecodedIdToken | null> => {
	if (!firebaseApp) {
		initializeFirebase();
	}

	if (!firebaseApp) {
		throw new Error('Firebase is not initialized');
	}

	try {
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		return decodedToken;
	} catch (error) {
		logger.error('Failed to verify Firebase ID token:', error);
		return null;
	}
};

/**
 * Get Firebase user by UID
 */
export const getFirebaseUser = async (uid: string): Promise<admin.auth.UserRecord | null> => {
	if (!firebaseApp) {
		initializeFirebase();
	}

	if (!firebaseApp) {
		throw new Error('Firebase is not initialized');
	}

	try {
		return await admin.auth().getUser(uid);
	} catch (error) {
		logger.error('Failed to get Firebase user:', error);
		return null;
	}
};

export default {
	initializeFirebase,
	verifyFirebaseToken,
	getFirebaseUser,
};
