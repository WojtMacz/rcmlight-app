import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, MoreVertical, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const roleVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'default',
  ANALYST: 'secondary',
  VIEWER: 'outline',
};
const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  ANALYST: 'Analityk',
  VIEWER: 'Przeglądający',
};

function initials(u: User) {
  return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
}

// ── Invite form ──────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail'),
  firstName: z.string().min(2, 'Min. 2 znaki').max(60),
  lastName: z.string().min(2, 'Min. 2 znaki').max(60),
  password: z
    .string()
    .min(8, 'Min. 8 znaków')
    .regex(/[A-Z]/, 'Wymagana wielka litera')
    .regex(/[0-9]/, 'Wymagana cyfra'),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']),
});
type InviteForm = z.infer<typeof inviteSchema>;

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange/50 ${className}`}
      {...props}
    />
  );
}

function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 ${className}`}
      {...props}
    />
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'ANALYST' },
  });

  const mutation = useMutation({
    mutationFn: (data: InviteForm) => api.post('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-xl border shadow-xl w-full max-w-md">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Dodaj użytkownika</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Utwórz konto dla pracownika Twojej firmy.</p>
          </div>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Imię</label>
                <Input {...register('firstName')} placeholder="Jan" />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nazwisko</label>
                <Input {...register('lastName')} placeholder="Kowalski" />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Adres e-mail</label>
              <Input {...register('email')} type="email" placeholder="jan@firma.pl" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Hasło tymczasowe</label>
              <Input {...register('password')} type="password" placeholder="Min. 8 znaków, wielka litera, cyfra" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Rola</label>
              <Select {...register('role')}>
                <option value="ANALYST">Analityk</option>
                <option value="VIEWER">Przeglądający</option>
                <option value="ADMIN">Administrator</option>
              </Select>
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Błąd tworzenia konta'}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Anuluj</Button>
              <Button type="submit" size="sm" variant="orange" disabled={mutation.isPending} className="gap-1.5">
                {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Utwórz konto
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── User row menu ────────────────────────────────────────────

function UserMenu({ u, currentUserId }: { u: User; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const roleMutation = useMutation({
    mutationFn: (role: string) => api.patch(`/users/${u.id}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const toggleActive = useMutation({
    mutationFn: () =>
      u.isActive
        ? api.delete(`/users/${u.id}`)
        : api.post(`/users/${u.id}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const isSelf = u.id === currentUserId;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-background shadow-lg py-1">
            {/* Change role */}
            <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">Zmień rolę</div>
            {(['ANALYST', 'VIEWER', 'ADMIN'] as const).map((role) => (
              <button
                key={role}
                type="button"
                disabled={u.role === role || roleMutation.isPending}
                onClick={() => { roleMutation.mutate(role); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-40 disabled:cursor-default"
              >
                {u.role === role ? `✓ ${roleLabels[role]}` : roleLabels[role]}
              </button>
            ))}
            {/* Activate/Deactivate */}
            {!isSelf && (
              <>
                <div className="border-t my-1" />
                <button
                  type="button"
                  disabled={toggleActive.isPending}
                  onClick={() => { toggleActive.mutate(); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-secondary ${u.isActive ? 'text-destructive' : 'text-green-600'}`}
                >
                  {u.isActive ? 'Dezaktywuj konto' : 'Aktywuj konto'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<{ data: { users: User[] } }>('/users');
      return res.data.data.users;
    },
  });

  const users = data ?? [];

  return (
    <>
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Użytkownicy</CardTitle>
              <CardDescription>Zarządzaj dostępem do systemu dla pracowników Twojej firmy.</CardDescription>
            </div>
            <Button variant="orange" size="sm" onClick={() => setShowInvite(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Dodaj użytkownika
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={`text-xs ${!u.isActive ? 'opacity-40' : ''}`}>
                      {initials(u)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!u.isActive ? 'text-muted-foreground' : ''}`}>
                      {u.firstName} {u.lastName}
                      {!u.isActive && (
                        <span className="ml-2 text-xs text-muted-foreground/60">(nieaktywny)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant={roleVariant[u.role] ?? 'outline'}>
                    {roleLabels[u.role] ?? u.role}
                  </Badge>
                  {currentUser?.role === 'ADMIN' && (
                    <UserMenu u={u} currentUserId={currentUser.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </>
  );
}
