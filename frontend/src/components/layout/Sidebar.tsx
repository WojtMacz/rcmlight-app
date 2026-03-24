import { useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  Home,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Menu,
  X,
  SlidersHorizontal,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMachine } from '@/hooks/useMachines';
import { ANALYSIS_STEPS, type AnalysisStep } from '@/types';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
}

function NavItem({ to, icon, label, collapsed, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          'text-white/70 hover:bg-white/10 hover:text-white',
          isActive && 'bg-white/15 text-white',
          collapsed && 'justify-center px-2',
        )
      }
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function AnalysisStepper({
  machineId,
  collapsed,
  completedSteps,
}: {
  machineId: string;
  collapsed: boolean;
  completedSteps: Set<AnalysisStep>;
}) {
  return (
    <div className={cn('mt-2 space-y-0.5', collapsed && 'flex flex-col items-center')}>
      {ANALYSIS_STEPS.map((step, index) => {
        const done = completedSteps.has(step.key);
        return (
          <NavLink
            key={step.key}
            to={`/app/machines/${machineId}/${step.key}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-xs transition-colors',
                'text-white/60 hover:bg-white/10 hover:text-white',
                isActive && 'bg-white/15 text-white font-medium',
                collapsed && 'justify-center px-2',
              )
            }
            title={collapsed ? `${index + 1}. ${step.label}` : undefined}
          >
            <span className="shrink-0">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-brand-orange" />
              ) : (
                <Circle className="h-4 w-4 opacity-50" />
              )}
            </span>
            {!collapsed && (
              <span className="truncate">
                {index + 1}. {step.label}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { machineId } = useParams<{ machineId: string }>();
  const { data: machine } = useMachine(machineId ?? '');

  // Placeholder: no steps completed yet — future prompts will calculate this
  const completedSteps = new Set<AnalysisStep>();

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full flex-col bg-brand-navy',
        collapsed ? 'w-16' : 'w-[260px]',
        'transition-all duration-200',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center border-b border-white/10 px-4 py-4',
        )}
      >
        <Link to="/app/dashboard" className="flex items-center justify-center w-full">
          <img
            src="/logo.png"
            alt="RCMLight"
            className={collapsed ? 'h-8 w-8 object-contain' : 'h-20 w-auto object-contain max-w-[200px]'}
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem
          to="/app/dashboard"
          icon={<Home className="h-4 w-4" />}
          label="Dashboard"
          collapsed={collapsed}
          end
        />

        {/* Machine context */}
        {machineId && machine && (
          <div className="mt-4">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                Analiza maszyny
              </p>
            )}
            {!collapsed && (
              <div className="mb-1 rounded-md bg-white/10 px-3 py-2">
                <p className="text-xs font-semibold text-white truncate">{machine.name}</p>
                <p className="text-[11px] text-white/50 truncate">Nr: {machine.number}</p>
              </div>
            )}
            <AnalysisStepper
              machineId={machineId}
              collapsed={collapsed}
              completedSteps={completedSteps}
            />
          </div>
        )}

        {/* Settings */}
        {user?.role === 'ADMIN' && (
          <div className="mt-4">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                Administracja
              </p>
            )}
            <NavItem
              to="/app/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Ustawienia"
              collapsed={collapsed}
            />
            <NavItem
              to="/app/settings/criticality-criteria"
              icon={<SlidersHorizontal className="h-4 w-4" />}
              label="Kryteria krytyczności"
              collapsed={collapsed}
            />
            <NavItem
              to="/app/settings/material-groups-dictionary"
              icon={<BookOpen className="h-4 w-4" />}
              label="Grupy materiałowe"
              collapsed={collapsed}
            />
          </div>
        )}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="shrink-0 border-t border-white/10 p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center rounded-md p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          aria-label={collapsed ? 'Rozwiń sidebar' : 'Zwiń sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex h-screen sticky top-0 shrink-0">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full z-50 flex">
            <div className="relative">
              {sidebarContent}
              <button
                onClick={onMobileClose}
                className="absolute right-2 top-4 rounded-md p-1 text-white/60 hover:text-white"
                aria-label="Zamknij menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden rounded-md p-2 text-muted-foreground hover:bg-secondary transition-colors"
      aria-label="Otwórz menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
