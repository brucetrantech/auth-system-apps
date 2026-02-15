import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SocialAuthButtons from '@/components/SocialAuthButtons';

export default function SignIn() {
	const navigate = useNavigate();
	const { login, error, clearError, isLoading } = useAuth();

	const [formData, setFormData] = useState({
		email: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});

	const validateForm = (): boolean => {
		const errors: Record<string, string> = {};

		if (!formData.email) {
			errors.email = 'Email is required';
		}

		if (!formData.password) {
			errors.password = 'Password is required';
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		clearError();

		if (!validateForm()) return;

		try {
			await login(formData);
			navigate('/');
		} catch {
			// Error is handled by context
		}
	};

	return (
		<div className="auth-container">
			<div className="auth-card">
				<div className="auth-header">
					<h1>Welcome Back</h1>
					<p>Sign in to your account</p>
				</div>

				{error && <div className="alert alert-error">{error}</div>}

				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<label htmlFor="email" className="form-label">
							Email
						</label>
						<input
							id="email"
							type="email"
							className={`form-input ${formErrors.email ? 'error' : ''}`}
							placeholder="you@example.com"
							value={formData.email}
							onChange={(e) => setFormData({ ...formData, email: e.target.value })}
						/>
						{formErrors.email && <div className="form-error">{formErrors.email}</div>}
					</div>

					<div className="form-group">
						<label htmlFor="password" className="form-label">
							Password
						</label>
						<input
							id="password"
							type="password"
							className={`form-input ${formErrors.password ? 'error' : ''}`}
							placeholder="••••••••"
							value={formData.password}
							onChange={(e) => setFormData({ ...formData, password: e.target.value })}
						/>
						{formErrors.password && (
							<div className="form-error">{formErrors.password}</div>
						)}
					</div>

					<button type="submit" className="btn btn-primary" disabled={isLoading}>
						{isLoading ? 'Signing in...' : 'Sign In'}
					</button>
				</form>

				<div className="social-divider">
					<span>or continue with</span>
				</div>

				<SocialAuthButtons action="signin" />

				<div className="auth-link">
					Don't have an account? <Link to="/signup">Sign up</Link>
				</div>
			</div>
		</div>
	);
}
