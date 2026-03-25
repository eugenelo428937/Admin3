import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import '@/components/admin/styles/admin.css';

export default function AdminLogin() {
  const { login, isAuthenticated, isSuperuser, isLoading } = useAuth() as any;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="admin-root tw:flex tw:h-screen tw:items-center tw:justify-center tw:bg-[var(--background)]">
        <div className="tw:text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && isSuperuser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login({ email, password });
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-root tw:flex tw:min-h-screen tw:items-center tw:justify-center tw:bg-[var(--background)]">
      <div className="tw:w-full tw:max-w-sm tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)] tw:p-8">
        <div className="tw:flex tw:flex-col tw:items-center tw:gap-2 tw:mb-6">
          <div className="tw:flex tw:h-10 tw:w-10 tw:items-center tw:justify-center tw:rounded-lg tw:bg-[var(--primary)] tw:text-[var(--primary-foreground)] tw:font-bold">
            A
          </div>
          <h1 className="tw:text-xl tw:font-semibold tw:text-[var(--foreground)]">Admin3</h1>
          <p className="tw:text-sm tw:text-[var(--muted-foreground)]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="tw:flex tw:flex-col tw:gap-4">
          <div className="tw:flex tw:flex-col tw:gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@acted.co.uk"
              required
            />
          </div>

          <div className="tw:flex tw:flex-col tw:gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="tw:text-sm tw:text-[var(--destructive)]">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="tw:w-full">
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
