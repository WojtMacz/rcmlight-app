import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, Copy, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ADMIN_TOKEN_KEY } from './AdminLoginPage';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

interface SuccessData {
  companyName: string;
  email: string;
  password: string;
}

function adminApi() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return {
    post: <T,>(url: string, data?: unknown) =>
      api.post<T>(url, data, { headers: { Authorization: `Bearer ${token}` } }),
  };
}

export default function AdminNewCompanyPage() {
  const navigate = useNavigate();

  // Company fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [downtimeCost, setDowntimeCost] = useState('2500');
  const [technicianCost, setTechnicianCost] = useState('100');
  const [unavailability, setUnavailability] = useState('0.03');

  // Admin user fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword());

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(toSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlugManual(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  }

  function handleGeneratePassword() {
    setPassword(generatePassword());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminApi().post('/admin/companies', {
        name,
        slug,
        defaultDowntimeCostPerHour: parseFloat(downtimeCost),
        defaultTechnicianHourlyCost: parseFloat(technicianCost),
        defaultAllowedUnavailability: parseFloat(unavailability),
        adminFirstName: firstName,
        adminLastName: lastName,
        adminEmail: email,
        adminPassword: password,
      });
      setSuccessData({ companyName: name, email, password });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Błąd podczas tworzenia firmy';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!successData) return;
    navigator.clipboard.writeText(`Email: ${successData.email}\nHasło: ${successData.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Success modal ──
  if (successData) {
    return (
      <div className="max-w-md mx-auto mt-16 space-y-6">
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✅</div>
            <div>
              <h2 className="font-semibold text-base">Firma "{successData.companyName}" została utworzona!</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Dane logowania dla administratora:</p>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/40 p-4 space-y-1 font-mono text-sm">
            <p><span className="text-muted-foreground">Email: </span>{successData.email}</p>
            <p><span className="text-muted-foreground">Hasło: </span>{successData.password}</p>
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
            ⚠️ Zapisz te dane — hasło nie będzie pokazane ponownie.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 flex-1" onClick={handleCopy}>
              {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Skopiowano!' : 'Skopiuj dane'}
            </Button>
            <Button className="flex-1" onClick={() => navigate('/admin/companies')}>
              Przejdź do listy firm
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/companies')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Powrót
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nowa firma</h1>
          <p className="text-sm text-muted-foreground">Utwórz firmę i konto administratora</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dane firmy</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nazwa firmy *</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              placeholder="Np. XYZ S.A."
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Slug *</label>
            <input
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              placeholder="xyz-sa"
              required
            />
            <p className="text-xs text-muted-foreground">Auto-generowany z nazwy. Tylko małe litery, cyfry i myślniki.</p>
          </div>
        </section>

        {/* Economic params */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Parametry domyślne</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Koszt postoju [PLN/h]</label>
              <input
                type="number"
                value={downtimeCost}
                onChange={(e) => setDowntimeCost(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                min="0"
                step="100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Stawka techn. [PLN/h]</label>
              <input
                type="number"
                value={technicianCost}
                onChange={(e) => setTechnicianCost(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                min="0"
                step="10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Niedyspozyc.</label>
              <input
                type="number"
                value={unavailability}
                onChange={(e) => setUnavailability(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                min="0"
                max="1"
                step="0.01"
              />
            </div>
          </div>
        </section>

        {/* Admin user section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Administrator firmy</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Imię *</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nazwisko *</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Hasło startowe *</label>
            <div className="flex gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                minLength={6}
                required
              />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleGeneratePassword}>
                <RefreshCw className="h-3.5 w-3.5" />
                Generuj
              </Button>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/companies')}>
            Anuluj
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Utwórz firmę
          </Button>
        </div>
      </form>
    </div>
  );
}
