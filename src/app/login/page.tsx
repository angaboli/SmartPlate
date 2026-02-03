'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogIn, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';
  const { login, loading, error, clearError } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.meta.requestStatus === 'fulfilled') {
      setIsRedirecting(true);
      // Small delay to ensure Redux state and cookie are persisted before redirect
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push(from);
      router.refresh();
    }
  };

  return (
    <>
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm bg-background/60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">{t('auth.redirecting')}</p>
        </div>
      )}
    <div className="mx-auto max-w-md space-y-8 py-12">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-bold">SmartPlate</h1>
        </div>
        <h2 className="text-xl font-semibold">{t('auth.welcomeBack')}</h2>
        <p className="text-muted-foreground">
          {t('auth.signInSubtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <button
              type="button"
              onClick={clearError}
              className="ml-2 underline"
            >
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="bg-input-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="bg-input-background"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-primary"
          disabled={loading}
        >
          {loading ? (
            t('auth.signingIn')
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              {t('auth.signIn')}
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="text-primary hover:underline">
          {t('auth.createOne')}
        </Link>
      </p>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
