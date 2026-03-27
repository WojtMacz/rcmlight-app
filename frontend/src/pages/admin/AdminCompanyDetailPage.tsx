import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ADMIN_TOKEN_KEY } from './AdminLoginPage';

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  defaultDowntimeCostPerHour: number;
  defaultTechnicianHourlyCost: number;
  defaultAllowedUnavailability: number;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  machines: Array<{
    id: string;
    number: string;
    name: string;
    createdAt: string;
  }>;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  ANALYST: 'Analityk',
  VIEWER: 'Przeglądający',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function adminApi() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return {
    get: <T,>(url: string) =>
      api.get<T>(url, { headers: { Authorization: `Bearer ${token}` } }),
    post: <T,>(url: string, data?: unknown) =>
      api.post<T>(url, data, { headers: { Authorization: `Bearer ${token}` } }),
    patch: <T,>(url: string, data?: unknown) =>
      api.patch<T>(url, data, { headers: { Authorization: `Bearer ${token}` } }),
    delete: <T,>(url: string) =>
      api.delete<T>(url, { headers: { Authorization: `Bearer ${token}` } }),
  };
}

type Tab = 'info' | 'users' | 'machines' | 'actions';

export default function AdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  // Info tab state
  const [editName, setEditName] = useState('');
  const [editDowntime, setEditDowntime] = useState('');
  const [editTechnician, setEditTechnician] = useState('');
  const [editUnavailability, setEditUnavailability] = useState('');
  const [infoEditing, setInfoEditing] = useState(false);

  // Add user state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState(generatePassword());
  const [newRole, setNewRole] = useState('ANALYST');
  const [addUserError, setAddUserError] = useState('');

  // Change password state
  const [changePwdUserId, setChangePwdUserId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');

  // Delete company state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-company', id],
    queryFn: async () => {
      const res = await adminApi().get<{ data: { company: CompanyDetail } }>(`/admin/companies/${id}`);
      return res.data.data.company;
    },
    enabled: !!id,
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      adminApi().patch(`/admin/companies/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company', id] });
      setInfoEditing(false);
    },
  });

  const addUserMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      adminApi().post(`/admin/companies/${id}/users`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setShowAddUser(false);
      setNewFirstName(''); setNewLastName(''); setNewEmail('');
      setNewPassword(generatePassword()); setNewRole('ANALYST');
      setAddUserError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Błąd';
      setAddUserError(msg);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: Record<string, unknown> }) =>
      adminApi().patch(`/admin/users/${userId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company', id] });
      setChangePwdUserId(null);
      setNewPwd('');
    },
  });

  const toggleCompanyMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      adminApi().patch(`/admin/companies/${id}/toggle-active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: () =>
      adminApi().delete(`/admin/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      navigate('/admin/companies', { replace: true });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Firma nie znaleziona.</p>;

  function startEdit() {
    setEditName(data!.name);
    setEditDowntime(String(data!.defaultDowntimeCostPerHour));
    setEditTechnician(String(data!.defaultTechnicianHourlyCost));
    setEditUnavailability(String(data!.defaultAllowedUnavailability));
    setInfoEditing(true);
  }

  function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    updateCompanyMutation.mutate({
      name: editName,
      defaultDowntimeCostPerHour: parseFloat(editDowntime),
      defaultTechnicianHourlyCost: parseFloat(editTechnician),
      defaultAllowedUnavailability: parseFloat(editUnavailability),
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Informacje' },
    { key: 'users', label: `Użytkownicy (${data.users.length})` },
    { key: 'machines', label: `Maszyny (${data.machines.length})` },
    { key: 'actions', label: 'Akcje' },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/companies')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Powrót
        </Button>
        <div>
          <h1 className="text-xl font-bold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            Slug: <span className="font-mono">{data.slug}</span> ·{' '}
            <Badge variant={data.isActive ? 'default' : 'outline'} className="text-xs">
              {data.isActive ? 'Aktywna' : 'Nieaktywna'}
            </Badge>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'border-b-2 border-brand-orange text-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Informacje */}
      {activeTab === 'info' && (
        <section className="space-y-4 max-w-md">
          {infoEditing ? (
            <form onSubmit={saveInfo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nazwa firmy</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Koszt postoju [PLN/h]</label>
                  <input type="number" value={editDowntime} onChange={(e) => setEditDowntime(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Stawka techn. [PLN/h]</label>
                  <input type="number" value={editTechnician} onChange={(e) => setEditTechnician(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Niedyspozyc.</label>
                  <input type="number" step="0.01" min="0" max="1" value={editUnavailability} onChange={(e) => setEditUnavailability(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setInfoEditing(false)}>Anuluj</Button>
                <Button type="submit" disabled={updateCompanyMutation.isPending}>
                  {updateCompanyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Zapisz
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border divide-y text-sm">
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Nazwa firmy</span>
                  <span className="font-medium">{data.name}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-mono">{data.slug}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Koszt postoju</span>
                  <span>{Number(data.defaultDowntimeCostPerHour).toLocaleString('pl-PL')} PLN/h</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Stawka technika</span>
                  <span>{Number(data.defaultTechnicianHourlyCost).toLocaleString('pl-PL')} PLN/h</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Niedyspozycyjność</span>
                  <span>{(Number(data.defaultAllowedUnavailability) * 100).toFixed(1)} %</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Data utworzenia</span>
                  <span>{new Date(data.createdAt).toLocaleDateString('pl-PL')}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={startEdit}>Edytuj</Button>
            </div>
          )}
        </section>
      )}

      {/* Tab: Użytkownicy */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Użytkownicy ({data.users.length})
            </h2>
            <Button size="sm" onClick={() => setShowAddUser(!showAddUser)}>
              {showAddUser ? 'Anuluj' : '+ Dodaj użytkownika'}
            </Button>
          </div>

          {showAddUser && (
            <div className="rounded-xl border p-4 space-y-3 bg-secondary/10">
              <h3 className="text-sm font-medium">Nowy użytkownik firmy</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Imię</label>
                  <input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nazwisko</label>
                  <input value={newLastName} onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Hasło</label>
                  <div className="flex gap-1">
                    <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 rounded-md border px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                    <Button type="button" variant="outline" size="sm" className="shrink-0 px-2"
                      onClick={() => setNewPassword(generatePassword())}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Rola</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                    className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 bg-background">
                    <option value="ADMIN">Administrator</option>
                    <option value="ANALYST">Analityk</option>
                    <option value="VIEWER">Przeglądający</option>
                  </select>
                </div>
              </div>
              {addUserError && <p className="text-xs text-destructive">{addUserError}</p>}
              <Button size="sm" disabled={addUserMutation.isPending}
                onClick={() => addUserMutation.mutate({
                  firstName: newFirstName, lastName: newLastName,
                  email: newEmail, password: newPassword, role: newRole,
                })}>
                {addUserMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Utwórz użytkownika
              </Button>
            </div>
          )}

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Imię i nazwisko</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">E-mail</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Rola</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.users.map((u) => (
                  <>
                    <tr key={u.id}>
                      <td className="px-4 py-2.5 font-medium">{u.firstName} {u.lastName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2.5">{roleLabels[u.role] ?? u.role}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={u.isActive ? 'secondary' : 'outline'} className="text-xs">
                          {u.isActive ? 'Aktywny' : 'Nieaktywny'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline"
                            onClick={() => {
                              setChangePwdUserId(changePwdUserId === u.id ? null : u.id);
                              setNewPwd('');
                            }}>
                            Zmień hasło
                          </Button>
                          <Button size="sm" variant="outline"
                            className={u.isActive ? 'text-destructive' : 'text-green-600'}
                            disabled={updateUserMutation.isPending}
                            onClick={() => updateUserMutation.mutate({ userId: u.id, body: { isActive: !u.isActive } })}>
                            {u.isActive ? 'Dezaktywuj' : 'Aktywuj'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {changePwdUserId === u.id && (
                      <tr key={`pwd-${u.id}`} className="bg-secondary/10">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">Nowe hasło:</span>
                            <input value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                              className="rounded-md border px-3 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-orange/50 w-56" />
                            <Button size="sm" variant="outline" className="px-2"
                              onClick={() => setNewPwd(generatePassword())}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button size="sm" disabled={!newPwd || updateUserMutation.isPending}
                              onClick={() => updateUserMutation.mutate({ userId: u.id, body: { password: newPwd } })}>
                              {updateUserMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                              Zapisz
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setChangePwdUserId(null)}>Anuluj</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Maszyny */}
      {activeTab === 'machines' && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Maszyny ({data.machines.length})
          </h2>
          {data.machines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak maszyn w tej firmie.</p>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nr</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nazwa</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Dodano</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.machines.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 font-mono text-xs">{m.number}</td>
                      <td className="px-4 py-2.5">{m.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString('pl-PL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab: Akcje */}
      {activeTab === 'actions' && (
        <section className="space-y-4 max-w-md">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Akcje administracyjne</h2>

          {/* Toggle active */}
          <div className="rounded-xl border p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Status firmy</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.isActive
                  ? 'Firma jest aktywna. Użytkownicy mogą się logować i korzystać z systemu.'
                  : 'Firma jest dezaktywowana. Użytkownicy nie mogą się zalogować.'}
              </p>
            </div>
            <Button
              variant="outline"
              className={data.isActive ? 'text-destructive' : 'text-green-600'}
              disabled={toggleCompanyMutation.isPending}
              onClick={() => toggleCompanyMutation.mutate(!data.isActive)}
            >
              {toggleCompanyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {data.isActive ? 'Dezaktywuj firmę' : 'Aktywuj firmę'}
            </Button>
          </div>

          {/* Delete company */}
          <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-destructive">Usuń firmę i wszystkie dane</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Trwale usuwa firmę, wszystkich użytkowników, maszyny, analizy RCM i całą historię.
                Tej operacji <strong>nie można cofnąć</strong>.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/5"
                onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmName(''); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń firmę
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-destructive font-medium">
                  Wpisz nazwę firmy <span className="font-mono bg-destructive/10 px-1 rounded">{data.name}</span>, aby potwierdzić usunięcie:
                </p>
                <input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full rounded-md border border-destructive/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  placeholder={data.name}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }}
                  >
                    Anuluj
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteConfirmName !== data.name || deleteCompanyMutation.isPending}
                    onClick={() => deleteCompanyMutation.mutate()}
                  >
                    {deleteCompanyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Usuń trwale
                  </Button>
                </div>
                {deleteCompanyMutation.isError && (
                  <p className="text-xs text-destructive">
                    {(deleteCompanyMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Błąd podczas usuwania'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
