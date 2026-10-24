'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Profile = {
  display_name: string;
  surname: string | null;
  email: string | null;
  contact_number: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    surname: '',
    email: '',
    contact_number: '',
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(async (response) => {
        const result = (await response.json()) as
          | { user: Profile }
          | { error?: string };
        if (response.status === 401) {
          router.replace('/login');
          return null;
        }
        if (!response.ok || !('user' in result)) {
          throw new Error(
            'error' in result
              ? result.error || 'Unable to load profile.'
              : 'Unable to load profile.'
          );
        }
        return result.user;
      })
      .then((user) => {
        if (!cancelled && user) {
          setProfile({
            display_name: user.display_name,
            surname: user.surname ?? '',
            email: user.email ?? '',
            contact_number: user.contact_number ?? '',
          });
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load profile.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          current_password: currentPassword,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'Unable to update your profile.');
      }
      setCurrentPassword('');
      setMessage('Your profile has been updated.');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold">My profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your name and contact details. Your current password is
            required to save changes. Change your password separately in
            Password settings.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-4 rounded-md bg-success/10 p-3 text-sm text-success"
            >
              {message}
            </p>
          )}
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile_first_name">First name</Label>
              <Input
                id="profile_first_name"
                value={profile.display_name}
                onChange={(event) =>
                  setProfile({ ...profile, display_name: event.target.value })
                }
                required
                minLength={2}
                maxLength={150}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_surname">Surname</Label>
              <Input
                id="profile_surname"
                value={profile.surname ?? ''}
                onChange={(event) =>
                  setProfile({ ...profile, surname: event.target.value })
                }
                required
                minLength={2}
                maxLength={100}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_email">Work email address</Label>
              <Input
                id="profile_email"
                type="email"
                autoComplete="email"
                value={profile.email ?? ''}
                onChange={(event) =>
                  setProfile({ ...profile, email: event.target.value })
                }
                required
                maxLength={254}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_contact_number">Contact number</Label>
              <Input
                id="profile_contact_number"
                type="tel"
                autoComplete="tel"
                value={profile.contact_number ?? ''}
                onChange={(event) =>
                  setProfile({ ...profile, contact_number: event.target.value })
                }
                required
                minLength={7}
                maxLength={30}
                disabled={loading}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile_current_password">Current password</Label>
              <Input
                id="profile_current_password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={loading || saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
              >
                Back to register
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
