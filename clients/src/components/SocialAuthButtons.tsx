import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type UserCredential } from 'firebase/auth';
import {
	signInWithGoogle,
	signInWithFacebook,
	firebaseSignOut,
	getSignInMethodsForEmail,
	linkPendingCredential,
	getProviderDisplayName,
	isCredentialConflictError,
	getCredentialFromError,
	type OAuthCredential,
} from '@/config/firebase';
import { authApi, getErrorMessage } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { FEATURE_OAUTH } from '@/config/constants';

interface SocialAuthButtonsProps {
	action: 'signin' | 'signup';
}

export default function SocialAuthButtons({ action }: SocialAuthButtonsProps) {
	const actionText = action === 'signin' ? 'Sign in' : 'Sign up';
	const navigate = useNavigate();
	const { refetchUser } = useAuth();
	const [isLoading, setIsLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingCredential, setPendingCredential] = useState<OAuthCredential | null>(null);
	const [linkingInfo, setLinkingInfo] = useState<{
		email: string;
		existingProviders: string[];
	} | null>(null);

	// Don't render if OAuth is disabled
	if (!FEATURE_OAUTH) {
		return null;
	}

	const handleFirebaseAuth = async (
		provider: 'google' | 'facebook',
		signInFn: () => Promise<UserCredential>,
	) => {
		setIsLoading(provider);
		setError(null);

		try {
			// Sign in with Firebase
			const result = await signInFn();

			// Get Firebase ID token
			const idToken = await result.user.getIdToken();

			// Send to backend for verification and user creation
			const authResponse = await authApi.firebaseAuth(idToken);

			// Store tokens
			localStorage.setItem('accessToken', authResponse.accessToken);
			localStorage.setItem('refreshToken', authResponse.refreshToken);

			// Sign out of Firebase (we use our own JWT tokens)
			await firebaseSignOut();

			// Refetch user and navigate
			await refetchUser();
			navigate('/');
		} catch (err) {
			console.error(`${provider} auth error:`, err);

			// Handle account-exists-with-different-credential error
			if (isCredentialConflictError(err)) {
				const email = (err.customData?.email as string) || '';
				const credential = getCredentialFromError(err);

				if (email && credential) {
					try {
						const methods = await getSignInMethodsForEmail(email);
						setPendingCredential(credential);
						setLinkingInfo({ email, existingProviders: methods });
						setError(
							`An account already exists with ${email}. Please sign in with ${methods.map(getProviderDisplayName).join(' or ')} first to link your accounts.`,
						);
					} catch {
						setError(
							'An account with this email already exists using a different sign-in method.',
						);
					}
				} else {
					setError(
						'An account with this email already exists using a different sign-in method.',
					);
				}
			} else {
				setError(getErrorMessage(err));
			}

			// Make sure to sign out of Firebase on error
			await firebaseSignOut().catch(() => {});
		} finally {
			setIsLoading(null);
		}
	};

	// Handle linking after signing in with existing provider
	const handleLinkAfterSignIn = async (
		signInFn: () => Promise<UserCredential>,
		provider: string,
	) => {
		if (!pendingCredential) return;

		setIsLoading(provider);
		setError(null);

		try {
			// Sign in with the existing provider
			const result = await signInFn();

			// Link the pending credential
			await linkPendingCredential(pendingCredential);

			// Get Firebase ID token
			const idToken = await result.user.getIdToken();

			// Send to backend
			const authResponse = await authApi.firebaseAuth(idToken);

			// Store tokens
			localStorage.setItem('accessToken', authResponse.accessToken);
			localStorage.setItem('refreshToken', authResponse.refreshToken);

			// Clear linking state
			setPendingCredential(null);
			setLinkingInfo(null);

			// Sign out of Firebase
			await firebaseSignOut();

			// Refetch user and navigate
			await refetchUser();
			navigate('/');
		} catch (err) {
			console.error('Link error:', err);
			setError(getErrorMessage(err));
			await firebaseSignOut().catch(() => {});
		} finally {
			setIsLoading(null);
		}
	};

	const handleGoogleAuth = () => {
		if (linkingInfo?.existingProviders.includes('google.com')) {
			return handleLinkAfterSignIn(signInWithGoogle, 'google');
		}
		return handleFirebaseAuth('google', signInWithGoogle);
	};

	const handleFacebookAuth = () => {
		if (linkingInfo?.existingProviders.includes('facebook.com')) {
			return handleLinkAfterSignIn(signInWithFacebook, 'facebook');
		}
		return handleFirebaseAuth('facebook', signInWithFacebook);
	};

	const handleAppleAuth = () => {
		// Apple Sign-In with Firebase requires additional setup
		// For now, use the passport-based flow
		window.location.href = '/api/v1/auth/oauth/apple';
	};

	const isLinkingWithGoogle = linkingInfo?.existingProviders.includes('google.com');
	const isLinkingWithFacebook = linkingInfo?.existingProviders.includes('facebook.com');

	return (
		<div className="social-buttons">
			{error && <div className="auth-error">{error}</div>}

			<button
				type="button"
				className={`social-btn${isLinkingWithGoogle ? ' social-btn-highlight' : ''}`}
				onClick={handleGoogleAuth}
				disabled={isLoading !== null}
			>
				{isLoading === 'google' ? (
					<div className="spinner-small" />
				) : (
					<svg viewBox="0 0 24 24">
						<path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
				)}
				{isLinkingWithGoogle ? 'Link with Google' : `${actionText} with Google`}
			</button>

			<button
				type="button"
				className={`social-btn${isLinkingWithFacebook ? ' social-btn-highlight' : ''}`}
				onClick={handleFacebookAuth}
				disabled={isLoading !== null}
			>
				{isLoading === 'facebook' ? (
					<div className="spinner-small" />
				) : (
					<svg viewBox="0 0 24 24">
						<path
							fill="#1877F2"
							d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
						/>
					</svg>
				)}
				{isLinkingWithFacebook ? 'Link with Facebook' : `${actionText} with Facebook`}
			</button>

			<button
				type="button"
				className="social-btn"
				onClick={handleAppleAuth}
				disabled={isLoading !== null}
			>
				<svg viewBox="0 0 24 24">
					<path
						fill="#000000"
						d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
					/>
				</svg>
				{actionText} with Apple
			</button>
		</div>
	);
}
