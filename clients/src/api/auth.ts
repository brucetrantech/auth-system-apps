import axios from 'axios';
import type { AuthResponse, RegisterRequest, LoginRequest, User, ApiError } from '@/types';
import { API_BASE_URL } from '@/config/constants';

// Backend wraps responses in { success, data }
interface ApiResponse<T> {
	success: boolean;
	data: T;
	message?: string;
}

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Add auth token to requests
api.interceptors.request.use((config) => {
	const token = localStorage.getItem('accessToken');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// Skip auth handling for public endpoints
		const publicEndpoints = [
			'/auth/verify-email',
			'/auth/login',
			'/auth/register',
			'/auth/refresh',
		];
		const isPublicEndpoint = publicEndpoints.some((ep) => originalRequest?.url?.includes(ep));

		if (
			error.response?.status === 401 &&
			originalRequest &&
			!originalRequest._retry &&
			!isPublicEndpoint
		) {
			originalRequest._retry = true;

			const refreshToken = localStorage.getItem('refreshToken');
			if (refreshToken) {
				try {
					const response = await axios.post<ApiResponse<AuthResponse>>(
						`${API_BASE_URL}/auth/refresh`,
						{
							refreshToken,
						},
					);

					localStorage.setItem('accessToken', response.data.data.accessToken);
					localStorage.setItem('refreshToken', response.data.data.refreshToken);

					originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
					return api(originalRequest);
				} catch {
					// Refresh failed, clear tokens but don't redirect - let AuthContext handle it
					localStorage.removeItem('accessToken');
					localStorage.removeItem('refreshToken');
				}
			}
		}

		return Promise.reject(error);
	},
);

export const authApi = {
	register: async (data: RegisterRequest): Promise<AuthResponse> => {
		const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
		return response.data.data;
	},

	login: async (data: LoginRequest): Promise<AuthResponse> => {
		const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
		return response.data.data;
	},

	firebaseAuth: async (idToken: string): Promise<AuthResponse> => {
		const response = await api.post<ApiResponse<AuthResponse>>('/auth/firebase', { idToken });
		return response.data.data;
	},

	logout: async (refreshToken: string): Promise<void> => {
		await api.post('/auth/logout', { refreshToken });
	},

	getMe: async (): Promise<User> => {
		const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
		return response.data.data.user;
	},

	verifyEmail: async (token: string): Promise<{ message: string }> => {
		const response = await api.get<ApiResponse<{ message: string }>>(
			`/auth/verify-email?token=${token}`,
		);
		return response.data.data;
	},

	resendVerification: async (): Promise<{ message: string }> => {
		const response = await api.post<ApiResponse<{ message: string }>>(
			'/auth/resend-verification',
		);
		return response.data.data;
	},

	getLinkedProviders: async (): Promise<
		{ id: string; provider: string; providerEmail: string; createdAt: string }[]
	> => {
		const response = await api.get<
			ApiResponse<{
				providers: {
					id: string;
					provider: string;
					providerEmail: string;
					createdAt: string;
				}[];
			}>
		>('/auth/me/providers');
		return response.data.data.providers;
	},

	unlinkProvider: async (
		provider: 'google' | 'facebook' | 'apple',
	): Promise<{ message: string }> => {
		const response = await api.delete<ApiResponse<{ message: string }>>('/auth/me/providers', {
			data: { provider },
		});
		return response.data.data;
	},
};

export const getErrorMessage = (error: unknown): string => {
	if (axios.isAxiosError(error)) {
		const apiError = error.response?.data as ApiError | undefined;
		return apiError?.message || error.message || 'An error occurred';
	}
	if (error instanceof Error) {
		return error.message;
	}
	return 'An unexpected error occurred';
};

export default api;
