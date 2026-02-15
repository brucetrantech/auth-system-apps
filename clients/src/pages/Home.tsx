import { useAuth } from '@/context/AuthContext';
import UserProfile from '@/components/UserProfile';

export default function Home() {
	const { user, logout, isLoading } = useAuth();

	const handleLogout = async () => {
		await logout();
	};

	if (!user) {
		return (
			<div className="loading-container">
				<div className="spinner" />
			</div>
		);
	}

	return (
		<div className="dashboard">
			{!user.emailVerified && (
				<div className="verification-banner">
					Your email is not verified. Please check your inbox for the verification link.
				</div>
			)}

			<header className="dashboard-header">
				<div className="dashboard-logo">AuthSystem</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
					<UserProfile
						displayName={user.displayName}
						email={user.email}
						emailVerified={user.emailVerified}
						avatarUrl={user.avatarUrl}
					/>
					<button className="logout-btn" onClick={handleLogout} disabled={isLoading}>
						Logout
					</button>
				</div>
			</header>

			<main className="dashboard-content">
				<h1 className="dashboard-title">Dashboard</h1>

				<div
					style={{
						display: 'grid',
						gap: '1.5rem',
						gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
					}}
				>
					<div className="card">
						<h2 className="card-title">Welcome!</h2>
						<p style={{ color: 'var(--text-secondary)' }}>
							You're successfully signed in to your account.
							{user.displayName && (
								<>
									{' '}
									Hello, <strong>{user.displayName}</strong>!
								</>
							)}
						</p>
					</div>

					<div className="card">
						<h2 className="card-title">Account Status</h2>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ color: 'var(--text-secondary)' }}>Email</span>
								<span>{user.email}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ color: 'var(--text-secondary)' }}>Verification</span>
								<span
									style={{
										color: user.emailVerified
											? 'var(--success)'
											: 'var(--warning)',
										fontWeight: 500,
									}}
								>
									{user.emailVerified ? 'Verified' : 'Pending'}
								</span>
							</div>
						</div>
					</div>

					<div className="card">
						<h2 className="card-title">Quick Actions</h2>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
							<button className="btn btn-outline" disabled>
								Edit Profile
							</button>
							<button className="btn btn-outline" disabled>
								Change Password
							</button>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
