import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center px-6">
      <p className="text-8xl font-bold text-muted-foreground/20">404</p>
      <h1 className="text-2xl font-bold text-foreground">Strona nie istnieje</h1>
      <p className="text-sm text-muted-foreground">
        Adres, który wpisujesz, nie istnieje lub strona została przeniesiona.
      </p>
      <Button asChild>
        <Link to="/app/dashboard">
          <Home className="h-4 w-4" />
          Wróć na dashboard
        </Link>
      </Button>
    </div>
  );
}
