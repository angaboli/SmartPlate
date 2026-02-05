'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProfileDTO, UpdateProfileInput } from '@/services/user.service';

function getAuthHeader(): Record<string, string> {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const { accessToken } = JSON.parse(stored);
      if (accessToken) return { Authorization: `Bearer ${accessToken}` };
    }
  } catch {}
  return {};
}

async function fetchProfile(): Promise<ProfileDTO> {
  const res = await fetch('/api/v1/me', { headers: getAuthHeader() });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch profile');
  }
  return res.json();
}

async function patchProfile(data: UpdateProfileInput): Promise<ProfileDTO> {
  const res = await fetch('/api/v1/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update profile');
  }
  return res.json();
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['meal-summary'] });
    },
  });
}
