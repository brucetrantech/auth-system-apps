import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { authApi, getErrorMessage } from '@/api/auth';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types';

// Routes where we should not auto-fetch user data
const PUBLIC_AUTH_ROUTES = ['/verify-email', '/auth/callback'];

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (data: LoginRequest) => Promise<void>;
	register: (data: RegisterRequest) => Promise<void>;
	logout: () => Promise<void>;
	setAuthFromCallback: (accessToken: string, refreshToken: string) => void;
	error: string | null;
	clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();
	const location = useLocation();
	const [error, setError] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	const hasToken = !!localStorage.getItem('accessToken');
	const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) =>
		location.pathname.startsWith(route),
	);

	const {
		data: user,
		isLoading: isUserLoading,
		refetch: refetchUser,
		isError: isUserError,
	} = useQuery({
		queryKey: ['user'],
		queryFn: authApi.getMe,
		enabled: hasToken && !isPublicAuthRoute,
		retry: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// Clear tokens if user query fails (e.g., 401)
	useEffect(() => {
		if (isUserError && hasToken && !isPublicAuthRoute) {
			localStorage.removeItem('accessToken');
			localStorage.removeItem('refreshToken');
		}
	}, [isUserError, hasToken, isPublicAuthRoute]);

	useEffect(() => {
		if (!hasToken || isPublicAuthRoute || !isUserLoading) {
			setIsInitialized(true);
		}
	}, [hasToken, isUserLoading, isPublicAuthRoute]);

	const loginMutation = useMutation({
		mutationFn: authApi.login,
		onSuccess: (data: AuthResponse) => {
			localStorage.setItem('accessToken', data.accessToken);
			localStorage.setItem('refreshToken', data.refreshToken);
			queryClient.setQueryData(['user'], data.user);
			setError(null);
		},
		onError: (err) => {
			setError(getErrorMessage(err));
		},
	});

	const registerMutation = useMutation({
		mutationFn: authApi.register,
		onSuccess: (data: AuthResponse) => {
			localStorage.setItem('accessToken', data.accessToken);
			localStorage.setItem('refreshToken', data.refreshToken);
			queryClient.setQueryData(['user'], data.user);
			setError(null);
		},
		onError: (err) => {
			setError(getErrorMessage(err));
		},
	});

	const login = useCallback(
		async (data: LoginRequest) => {
			await loginMutation.mutateAsync(data);
		},
		[loginMutation],
	);

	const register = useCallback(
		async (data: RegisterRequest) => {
			await registerMutation.mutateAsync(data);
		},
		[registerMutation],
	);

	const logout = useCallback(async () => {
		const refreshToken = localStorage.getItem('refreshToken');
		if (refreshToken) {
			try {
				await authApi.logout(refreshToken);
			} catch {
				// Ignore logout errors
			}
		}
		localStorage.removeItem('accessToken');
		localStorage.removeItem('refreshToken');
		queryClient.setQueryData(['user'], null);
		queryClient.clear();
	}, [queryClient]);

	const setAuthFromCallback = useCallback(
		(accessToken: string, refreshToken: string) => {
			localStorage.setItem('accessToken', accessToken);
			localStorage.setItem('refreshToken', refreshToken);
			refetchUser();
		},
		[refetchUser],
	);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const value: AuthContextType = {
		user: user ?? null,
		isAuthenticated: !!user,
		isLoading:
			!isInitialized ||
			(hasToken && !isPublicAuthRoute && isUserLoading) ||
			loginMutation.isPending ||
			registerMutation.isPending,
		login,
		register,
		logout,
		setAuthFromCallback,
		error,
		clearError,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
