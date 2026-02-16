import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import { APP_NAME } from '@/config/constants';

export default function SignUp() {
	const navigate = useNavigate();
	const { register, error, clearError, isLoading } = useAuth();

	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		displayName: '',
	});
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});

	const validateForm = (): boolean => {
		const errors: Record<string, string> = {};

		if (!formData.email) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'Please enter a valid email';
		}

		if (!formData.password) {
			errors.password = 'Password is required';
		} else if (formData.password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		}

		if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		clearError();

		if (!validateForm()) return;

		try {
			await register({
				email: formData.email,
				password: formData.password,
				displayName: formData.displayName || undefined,
			});
			navigate('/');
		} catch {
			// Error is handled by context
		}
	};

	return (
		<div className="auth-container">
			<div className="auth-card">
				<div className="auth-header">
					<div className="auth-logo">{APP_NAME}</div>
					<h1>Create Account</h1>
					<p>Sign up to get started</p>
				</div>

				{error && <div className="alert alert-error">{error}</div>}

				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<label htmlFor="displayName" className="form-label">
							Full Name
						</label>
						<input
							id="displayName"
							type="text"
							className="form-input"
							placeholder="John Doe"
							value={formData.displayName}
							onChange={(e) =>
								setFormData({ ...formData, displayName: e.target.value })
							}
						/>
					</div>

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

					<div className="form-group">
						<label htmlFor="confirmPassword" className="form-label">
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							className={`form-input ${formErrors.confirmPassword ? 'error' : ''}`}
							placeholder="••••••••"
							value={formData.confirmPassword}
							onChange={(e) =>
								setFormData({ ...formData, confirmPassword: e.target.value })
							}
						/>
						{formErrors.confirmPassword && (
							<div className="form-error">{formErrors.confirmPassword}</div>
						)}
					</div>

					<button type="submit" className="btn btn-primary" disabled={isLoading}>
						{isLoading ? 'Creating account...' : 'Create Account'}
					</button>
				</form>

				<div className="social-divider">
					<span>or continue with</span>
				</div>

				<SocialAuthButtons action="signup" />

				<div className="auth-link">
					Already have an account? <Link to="/signin">Sign in</Link>
				</div>
			</div>
		</div>
	);
}
