import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, LogOut, Building2 } from 'lucide-react';
import { ADMIN_TOKEN_KEY } from './AdminLoginPage';
import { Button } from '@/components/ui/button';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!localStorage.getItem(ADMIN_TOKEN_KEY)) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b px-6 py-3 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-brand-orange shrink-0" />
        <span className="font-bold">RCMLight — Panel Super Admina</span>
        <nav className="flex items-center gap-1 ml-6">
          <Link
            to="/admin/companies"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              location.pathname.startsWith('/admin/companies')
                ? 'bg-brand-orange/10 text-brand-orange'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Firmy
          </Link>
        </nav>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Wyloguj
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
