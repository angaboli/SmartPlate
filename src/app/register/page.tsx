'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError(t('auth.passwordsMismatch'));
      return;
    }

    if (password.length < 8) {
      setLocalError(t('auth.passwordTooShort'));
      return;
    }

    const result = await register(email, password, name);
    if (result.meta.requestStatus === 'fulfilled') {
      const tokens = (result.payload as any).tokens;
      document.cookie = `accessToken=${tokens.accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
      router.push('/dashboard');
    }
  };

  const displayError = localError || error;

  return (
    <div className="mx-auto max-w-md space-y-8 py-12">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-bold">SmartPlate</h1>
        </div>
        <h2 className="text-xl font-semibold">{t('auth.createAccount')}</h2>
        <p className="text-muted-foreground">
          {t('auth.startJourney')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {displayError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {displayError}
            <button
              type="button"
              onClick={() => {
                setLocalError('');
                clearError();
              }}
              className="ml-2 underline"
            >
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">{t('auth.fullName')}</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="bg-input-background"
          />
        </div>

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
            autoComplete="new-password"
            className="bg-input-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="bg-input-background"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-primary"
          disabled={loading}
        >
          {loading ? (
            t('auth.creatingAccount')
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('auth.createAccountBtn')}
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="text-primary hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  );
}
