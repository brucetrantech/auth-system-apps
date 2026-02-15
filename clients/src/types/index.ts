export interface User {
	id: string;
	email: string;
	displayName: string | null;
	emailVerified: boolean;
	avatarUrl: string | null;
}

export interface AuthResponse {
	user: User;
	accessToken: string;
	refreshToken: string;
	tokenType: string;
	expiresIn: number;
}

export interface RegisterRequest {
	email: string;
	password: string;
	displayName?: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface ApiError {
	message: string;
	code?: string;
	details?: Record<string, string[]>;
}
