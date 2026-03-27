import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export const ADMIN_TOKEN_KEY = 'rcm_super_admin_token';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ data: { token: string } }>('/admin/login', { email, password });
      localStorage.setItem(ADMIN_TOKEN_KEY, res.data.data.token);
      queryClient.clear();
      navigate('/admin/companies');
    } catch {
      setError('Nieprawidłowe dane logowania');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="h-8 w-8 text-brand-orange" />
            <span className="text-2xl font-bold">RCMLight</span>
          </div>
          <h1 className="text-xl font-semibold">Panel Super Admina</h1>
          <p className="text-sm text-muted-foreground mt-1">Zaloguj się kontem super administratora</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              placeholder="superadmin@rcmlight.app"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Zaloguj się
          </Button>
        </form>
      </div>
    </div>
  );
}
