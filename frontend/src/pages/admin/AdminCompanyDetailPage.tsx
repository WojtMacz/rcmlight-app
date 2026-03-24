import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
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

export default function AdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-company', id],
    queryFn: async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const res = await api.get<{ data: { company: CompanyDetail } }>(`/admin/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data.company;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Firma nie znaleziona.</p>;

  return (
    <div className="space-y-6 max-w-4xl">
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

      {/* Users */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Użytkownicy ({data.users.length})
        </h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Imię i nazwisko</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">E-mail</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Rola</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">{roleLabels[u.role] ?? u.role}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={u.isActive ? 'secondary' : 'outline'} className="text-xs">
                      {u.isActive ? 'Aktywny' : 'Nieaktywny'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Machines */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Maszyny ({data.machines.length})
        </h2>
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
      </section>
    </div>
  );
}
