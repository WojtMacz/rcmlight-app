import { ChevronRight, Home } from 'lucide-react';
import { Link, useMatches } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbHandle {
  crumb: string | ((data: unknown) => string);
}

interface Match {
  id: string;
  pathname: string;
  handle?: BreadcrumbHandle;
  data?: unknown;
}

export function Breadcrumbs({ className }: { className?: string }) {
  const matches = useMatches() as Match[];
  const crumbs = matches
    .filter((m) => m.handle?.crumb)
    .map((m) => ({
      pathname: m.pathname,
      label: typeof m.handle!.crumb === 'function' ? m.handle!.crumb(m.data) : m.handle!.crumb,
    }));

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      <Link to="/app/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.pathname} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground truncate max-w-[200px]">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.pathname}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
