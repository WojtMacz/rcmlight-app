import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  ANALYST: 'Analityk',
  VIEWER: 'Przeglądający',
};

// ── Profile form ─────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 znaki').max(60),
  lastName: z.string().min(2, 'Minimum 2 znaki').max(60),
});
type ProfileForm = z.infer<typeof profileSchema>;

// ── Password form ────────────────────────────────────────────

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Wymagane'),
    newPassword: z
      .string()
      .min(8, 'Minimum 8 znaków')
      .regex(/[A-Z]/, 'Wymagana wielka litera')
      .regex(/[0-9]/, 'Wymagana cyfra'),
    confirmPassword: z.string().min(1, 'Wymagane'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Hasła nie są zgodne',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Input component ──────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange/50 ${className}`}
      {...props}
    />
  );
}

// ── Main ─────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch('/users/me', data),
    onSuccess: () => {
      refreshUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      api.post('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      passwordForm.reset();
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    },
  });

  if (!user) return null;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-lg">
      {/* Profile info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 text-lg">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {user.firstName} {user.lastName}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0">
              {roleLabels[user.role] ?? user.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Imię" error={profileForm.formState.errors.firstName?.message}>
                <Input {...profileForm.register('firstName')} placeholder="Jan" />
              </Field>
              <Field label="Nazwisko" error={profileForm.formState.errors.lastName?.message}>
                <Input {...profileForm.register('lastName')} placeholder="Kowalski" />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                variant="orange"
                disabled={profileMutation.isPending}
                className="gap-1.5"
              >
                {profileMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Zapisz dane
              </Button>
              {profileSaved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" /> Zapisano
                </span>
              )}
              {profileMutation.isError && (
                <span className="text-sm text-destructive">Błąd zapisu</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password change card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zmiana hasła</CardTitle>
          <CardDescription>Po zmianie hasła wszystkie aktywne sesje zostaną zakończone.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}
            className="space-y-4"
          >
            <Field
              label="Aktualne hasło"
              error={passwordForm.formState.errors.currentPassword?.message}
            >
              <Input
                type="password"
                {...passwordForm.register('currentPassword')}
                autoComplete="current-password"
              />
            </Field>
            <Field
              label="Nowe hasło"
              error={passwordForm.formState.errors.newPassword?.message}
            >
              <Input
                type="password"
                {...passwordForm.register('newPassword')}
                autoComplete="new-password"
              />
            </Field>
            <Field
              label="Powtórz nowe hasło"
              error={passwordForm.formState.errors.confirmPassword?.message}
            >
              <Input
                type="password"
                {...passwordForm.register('confirmPassword')}
                autoComplete="new-password"
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={passwordMutation.isPending}
                className="gap-1.5"
              >
                {passwordMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Zmień hasło
              </Button>
              {passwordSaved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" /> Hasło zmienione
                </span>
              )}
              {passwordMutation.isError && (
                <span className="text-sm text-destructive">
                  {(passwordMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                    'Błąd zmiany hasła'}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
