import { NavLink, Outlet } from 'react-router-dom';
import { User, Users, Building2, SlidersHorizontal, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsLayout() {
  const { user } = useAuth();

  const navItems = [
    { to: '/app/settings/profile', icon: <User className="h-4 w-4" />, label: 'Mój profil' },
    ...(user?.role === 'ADMIN'
      ? [
          { to: '/app/settings/users', icon: <Users className="h-4 w-4" />, label: 'Użytkownicy' },
          { to: '/app/settings/company', icon: <Building2 className="h-4 w-4" />, label: 'Firma' },
          { to: '/app/settings/criticality-criteria', icon: <SlidersHorizontal className="h-4 w-4" />, label: 'Kryteria krytyczności' },
          { to: '/app/settings/material-groups-dictionary', icon: <BookOpen className="h-4 w-4" />, label: 'Grupy materiałowe' },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ustawienia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Zarządzaj kontem i użytkownikami firmy.</p>
      </div>

      <div className="flex gap-8">
        {/* Side nav */}
        <nav className="hidden sm:flex w-48 shrink-0 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
