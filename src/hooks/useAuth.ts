'use client';

import { useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  loginUser,
  registerUser,
  logout as logoutAction,
  hydrateAuth,
  markHydrated,
  clearError,
} from '@/store/slices/authSlice';
import { isTokenExpired } from '@/lib/fetchWithAuth';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken, isHydrated, loading, error } =
    useAppSelector((state) => state.auth);

  // Hydrate auth from localStorage on mount, checking token validity
  useEffect(() => {
    if (user) {
      dispatch(markHydrated());
      return;
    }

    let cancelled = false;

    async function hydrate() {
      const stored = localStorage.getItem('auth');
      if (!stored) {
        if (!cancelled) dispatch(markHydrated());
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        if (!parsed.user || !parsed.accessToken || !parsed.refreshToken) {
          localStorage.removeItem('auth');
          if (!cancelled) dispatch(markHydrated());
          return;
        }

        // If access token is still valid, hydrate directly
        if (!isTokenExpired(parsed.accessToken)) {
          if (!cancelled) dispatch(hydrateAuth(parsed));
          return;
        }

        // Access token expired – try to refresh before hydrating
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: parsed.refreshToken }),
        });

        if (res.ok) {
          const tokens = await res.json();
          const newAuth = {
            user: parsed.user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          };
          localStorage.setItem('auth', JSON.stringify(newAuth));
          document.cookie = `accessToken=${tokens.accessToken}; path=/; max-age=${24 * 60 * 60}; samesite=lax`;
          if (!cancelled) dispatch(hydrateAuth(newAuth));
        } else {
          // Refresh failed – clear stale auth completely
          localStorage.removeItem('auth');
          document.cookie = 'accessToken=; path=/; max-age=0; samesite=lax';
          if (!cancelled) dispatch(markHydrated());
        }
      } catch {
        localStorage.removeItem('auth');
        document.cookie = 'accessToken=; path=/; max-age=0; samesite=lax';
        if (!cancelled) dispatch(markHydrated());
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
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
    isHydrated,
    loading,
    error,
    login,
    register,
    logout,
    clearError: () => dispatch(clearError()),
  };
}
