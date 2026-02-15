import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import Home from '@/pages/Home';
import VerifyEmail from '@/pages/VerifyEmail';
import AuthCallback from '@/pages/AuthCallback';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="loading-container">
				<div className="spinner" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/signin" replace />;
	}

	return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="loading-container">
				<div className="spinner" />
			</div>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
}

function App() {
	return (
		<Routes>
			<Route
				path="/signin"
				element={
					<PublicRoute>
						<SignIn />
					</PublicRoute>
				}
			/>
			<Route
				path="/signup"
				element={
					<PublicRoute>
						<SignUp />
					</PublicRoute>
				}
			/>
			<Route
				path="/"
				element={
					<ProtectedRoute>
						<Home />
					</ProtectedRoute>
				}
			/>
			<Route path="/verify-email" element={<VerifyEmail />} />
			<Route path="/auth/callback" element={<AuthCallback />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;
