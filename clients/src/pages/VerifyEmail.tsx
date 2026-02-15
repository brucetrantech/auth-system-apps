import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi, getErrorMessage } from '@/api/auth';

type VerificationStatus = 'loading' | 'success' | 'error';

export default function VerifyEmail() {
	const [searchParams] = useSearchParams();
	const [status, setStatus] = useState<VerificationStatus>('loading');
	const [message, setMessage] = useState('');
	const hasCalledRef = useRef(false);

	useEffect(() => {
		// Prevent double call in React StrictMode
		if (hasCalledRef.current) return;

		const token = searchParams.get('token');

		if (!token) {
			setStatus('error');
			setMessage('Invalid verification link. No token provided.');
			return;
		}

		hasCalledRef.current = true;

		const verifyEmail = async () => {
			try {
				const result = await authApi.verifyEmail(token);
				setStatus('success');
				setMessage(result.message || 'Your email has been verified successfully!');
			} catch (error) {
				setStatus('error');
				setMessage(getErrorMessage(error));
			}
		};

		verifyEmail();
	}, [searchParams]);

	if (status === 'loading') {
		return (
			<div className="loading-container">
				<div className="spinner" />
			</div>
		);
	}

	if (status === 'error') {
		return (
			<div className="success-container">
				<div
					className="success-icon"
					style={{ background: '#fef2f2', color: 'var(--danger)' }}
				>
					<svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<h1 className="success-title">Verification Failed</h1>
				<p className="success-message">{message}</p>
				<Link to="/signin" className="btn btn-primary" style={{ maxWidth: '200px' }}>
					Go to Sign In
				</Link>
			</div>
		);
	}

	return (
		<div className="success-container">
			<div className="success-icon">
				<svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
				</svg>
			</div>
			<h1 className="success-title">Email Verified!</h1>
			<p className="success-message">{message}</p>
			<Link to="/" className="btn btn-primary" style={{ maxWidth: '200px' }}>
				Go to Home
			</Link>
		</div>
	);
}
