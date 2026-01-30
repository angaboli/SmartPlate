'use client';

import { useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  loginUser,
  registerUser,
  logout as logoutAction,
  hydrateAuth,
  clearError,
} from '@/store/slices/authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken, loading, error } = useAppSelector(
    (state) => state.auth,
  );

  // Hydrate auth from localStorage on mount
  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem('auth');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.user && parsed.accessToken && parsed.refreshToken) {
            dispatch(hydrateAuth(parsed));
          }
        } catch {
          localStorage.removeItem('auth');
        }
      }
    }
  }, [dispatch, user]);

  const login = useCallback(
    (email: string, password: string) => {
      return dispatch(loginUser({ email, password }));
    },
    [dispatch],
  );

  const register = useCallback(
    (email: string, password: string, name: string) => {
      return dispatch(registerUser({ email, password, name }));
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Proceed with local logout even if API fails
      }
    }
    dispatch(logoutAction());
  }, [dispatch, refreshToken]);

  return {
    user,
    accessToken,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    logout,
    clearError: () => dispatch(clearError()),
  };
}
