import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallback() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { setAuthFromCallback } = useAuth();

	useEffect(() => {
		const accessToken = searchParams.get('accessToken');
		const refreshToken = searchParams.get('refreshToken');
		const error = searchParams.get('error');

		if (error) {
			navigate('/signin?error=' + encodeURIComponent(error));
			return;
		}

		if (accessToken && refreshToken) {
			setAuthFromCallback(accessToken, refreshToken);
			navigate('/');
		} else {
			navigate('/signin?error=missing_tokens');
		}
	}, [searchParams, navigate, setAuthFromCallback]);

	return (
		<div className="loading-container">
			<div className="spinner" />
		</div>
	);
}
