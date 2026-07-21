'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useProfile } from './useProfile';

export function hasActiveAccess(status: string | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export function useSubscription() {
  const { data: profile, isLoading } = useProfile();

  return {
    status: profile?.subscriptionStatus,
    currentPeriodEnd: profile?.subscriptionCurrentPeriodEnd ?? null,
    hasActiveAccess: hasActiveAccess(profile?.subscriptionStatus),
    isLoading,
  };
}

async function postForUrl(path: string): Promise<string> {
  const res = await fetchWithAuth(path, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to start Stripe session');
  }
  const { url } = await res.json();
  return url as string;
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: () => postForUrl('/api/v1/stripe/checkout'),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: () => postForUrl('/api/v1/stripe/portal'),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
