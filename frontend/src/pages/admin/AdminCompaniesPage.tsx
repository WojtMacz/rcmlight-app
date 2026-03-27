import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, Plus, Trash2 } from 'lucide-react';
import { api, tokenStorage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ADMIN_TOKEN_KEY } from './AdminLoginPage';

interface Company {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; machines: number };
}

function adminApi() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return {
    get: <T,>(url: string) =>
      api.get<T>(url, { headers: { Authorization: `Bearer ${token}` } }),
    patch: <T,>(url: string, data?: unknown) =>
      api.patch<T>(url, data, { headers: { Authorization: `Bearer ${token}` } }),
    post: <T,>(url: string, data?: unknown) =>
      api.post<T>(url, data, { headers: { Authorization: `Bearer ${token}` } }),
    delete: <T,>(url: string) =>
      api.delete<T>(url, { headers: { Authorization: `Bearer ${token}` } }),
  };
}

export default function AdminCompaniesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Which company row is in "confirm delete" mode
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const res = await adminApi().get<{ data: { companies: Company[] } }>('/admin/companies');
      return res.data.data.companies;
    },
    retry: false,
    staleTime: 0,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi().patch(`/admin/companies/${id}/toggle-active`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  const impersonateMutation = useMutation({
    mutationFn: (id: string) =>
      adminApi().post<{ data: { accessToken: string } }>(`/admin/companies/${id}/impersonate`),
    onSuccess: (res) => {
      tokenStorage.set(res.data.data.accessToken, '');
      window.location.href = '/app/dashboard';
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi().delete(`/admin/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Błąd ładowania firm. Sprawdź token admina.</p>;
  }

  const companies = data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Firmy ({companies.length})</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Zarządzaj firmami korzystającymi z RCMLight.
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/admin/companies/new')}>
          <Plus className="h-4 w-4" />
          Dodaj nową firmę
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Firma</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Slug</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Użytkownicy</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Maszyny</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companies.map((c) => (
              <>
                <tr key={c.id} className="hover:bg-secondary/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-3 text-center">{c._count.users}</td>
                  <td className="px-4 py-3 text-center">{c._count.machines}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={c.isActive ? 'default' : 'outline'}>
                      {c.isActive ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/companies/${c.id}`)}
                      >
                        Szczegóły
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={impersonateMutation.isPending}
                        onClick={() => impersonateMutation.mutate(c.id)}
                        title="Zaloguj się jako admin tej firmy (30 min)"
                      >
                        Impersonuj
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleMutation.isPending}
                        className={c.isActive ? 'text-destructive' : 'text-green-600'}
                        onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                      >
                        {c.isActive ? 'Dezaktywuj' : 'Aktywuj'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/5 px-2"
                        title="Usuń firmę i wszystkie dane"
                        onClick={() => {
                          setDeleteConfirmId(c.id);
                          setDeleteConfirmName('');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {/* Inline delete confirmation row */}
                {deleteConfirmId === c.id && (
                  <tr key={`del-${c.id}`} className="bg-destructive/5 border-l-2 border-destructive">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-destructive font-medium shrink-0">
                          Wpisz nazwę firmy aby potwierdzić usunięcie:
                        </span>
                        <input
                          autoFocus
                          value={deleteConfirmName}
                          onChange={(e) => setDeleteConfirmName(e.target.value)}
                          placeholder={c.name}
                          className="rounded-md border border-destructive/40 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 w-56"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteConfirmName !== c.name || deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(c.id)}
                        >
                          {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                          Usuń trwale
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
                        >
                          Anuluj
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
