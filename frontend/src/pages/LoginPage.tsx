import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/app/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // If already logged in, redirect
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  async function onSubmit(values: LoginForm) {
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const message = axiosErr.response?.data?.message ?? 'Błąd logowania. Spróbuj ponownie.';
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-brand-navy px-12">
        <div className="max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <img
              src="/logo.png"
              alt="RCMLight"
              className="h-32 w-auto object-contain"
            />
          </div>
          <p className="text-xl font-medium text-white/80 leading-relaxed">
            Analiza niezawodności maszyn
          </p>
          <p className="mt-4 text-sm text-white/50 leading-relaxed">
            Platforma do prowadzenia analiz RCM — od struktury BOM po harmonogram zadań
            prewencyjnych PM.
          </p>

          {/* Feature list */}
          <ul className="mt-10 space-y-3 text-left">
            {[
              'Hierarchiczna struktura BOM',
              'Analiza funkcji i dysfunkcji',
              'Ocena krytyczności usterek',
              'Harmonogram zadań PM',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-orange shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center lg:hidden">
            <img
              src="/logo.png"
              alt="RCMLight"
              className="h-10 w-auto object-contain"
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground">Logowanie</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zaloguj się, aby kontynuować pracę.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Adres e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="jan.kowalski@firma.pl"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Hasło</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Zapomniałem hasła
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logowanie...
                </>
              ) : (
                'Zaloguj się'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
