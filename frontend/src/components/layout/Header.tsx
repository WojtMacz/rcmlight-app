import { LogOut, User, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { MobileMenuButton } from './Sidebar';

interface HeaderProps {
  onMobileMenuOpen: () => void;
  title?: string;
}

function userInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrator',
    ANALYST: 'Analityk',
    VIEWER: 'Przeglądający',
  };
  return labels[role] ?? role;
}

export function Header({ onMobileMenuOpen, title }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Wylogowano pomyślnie');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 shadow-sm">
      <MobileMenuButton onClick={onMobileMenuOpen} />

      {/* Title / breadcrumb area */}
      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
        )}
      </div>

      {/* Right side */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 hover:bg-secondary transition-colors outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{userInitials(user.firstName, user.lastName)}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{roleLabel(user.role)}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/settings/profile" className="cursor-pointer">
                <User className="h-4 w-4" />
                Mój profil
              </Link>
            </DropdownMenuItem>
            {user.role === 'ADMIN' && (
              <DropdownMenuItem asChild>
                <Link to="/app/settings/users" className="cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Użytkownicy
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Wyloguj się
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
