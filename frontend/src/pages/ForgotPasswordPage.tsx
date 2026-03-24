import { Link } from 'react-router-dom';
import { Cpu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <Cpu className="h-7 w-7 text-brand-orange" />
          <span className="text-xl font-bold text-foreground tracking-tight">RCMLight</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground">Resetuj hasło</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Funkcja resetowania hasła będzie dostępna wkrótce. Skontaktuj się z administratorem systemu.
        </p>

        <div className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Adres e-mail</Label>
            <Input id="email" type="email" placeholder="jan.kowalski@firma.pl" disabled />
          </div>
          <Button className="w-full" disabled>
            Wyślij link resetujący (wkrótce)
          </Button>
        </div>

        <div className="mt-6">
          <Link
            to="/login"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do logowania
          </Link>
        </div>
      </div>
    </div>
  );
}
