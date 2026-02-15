interface UserProfileProps {
	displayName: string | null;
	email: string;
	emailVerified: boolean;
	avatarUrl?: string | null;
}

function getInitials(name: string | null, email: string): string {
	if (name) {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	}
	return email.slice(0, 2).toUpperCase();
}

export default function UserProfile({
	displayName,
	email,
	emailVerified,
	avatarUrl,
}: UserProfileProps) {
	const initials = getInitials(displayName, email);
	const displayText = displayName || email;

	return (
		<div className="user-profile">
			{avatarUrl ? (
				<img src={avatarUrl} alt={displayText} className="user-avatar" />
			) : (
				<div className="user-avatar">{initials}</div>
			)}
			<div className="user-info">
				<span className="user-name">{displayText}</span>
				<span className={`user-status ${emailVerified ? 'verified' : 'unverified'}`}>
					<span className="user-status-dot" />
					{emailVerified ? 'Verified' : 'Unverified'}
				</span>
			</div>
		</div>
	);
}
