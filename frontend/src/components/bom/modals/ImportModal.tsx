import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (formData: FormData) => void;
  isPending: boolean;
}

type PreviewRow = Record<string, string | number>;

export function ImportModal({ open, onOpenChange, onImport, isPending }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'array' });
      const sheetName = wb.SheetNames.includes('BOM') ? 'BOM' : wb.SheetNames[0];
      if (!sheetName) return;
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<PreviewRow>(ws, { defval: '' });
      const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
      setHeaders(hdrs);
      setPreview(rows.slice(0, 10));
    };
    reader.readAsArrayBuffer(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.match(/\.(xlsx|xls)$/i)) handleFile(f);
  }

  function handleImport() {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    onImport(fd);
  }

  function reset() {
    setFile(null);
    setPreview([]);
    setHeaders([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importuj BOM z Excel</DialogTitle>
          <DialogDescription>
            Plik XLSX musi zawierać arkusz "BOM" z kolumnami: System Nr, System Nazwa, Zespół Nr,
            Zespół Nazwa, Grupa Kod, Grupa Nazwa, Kategoria, Część Nazwa, Część Nr Kat.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Przeciągnij plik XLSX lub kliknij aby wybrać</p>
              <p className="text-xs text-muted-foreground mt-1">Akceptuje .xlsx, .xls · max 10 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-secondary/30">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={reset}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {preview.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Podgląd (pierwsze {preview.length} wierszy z danych):
                  </p>
                  <div className="overflow-auto border rounded-md max-h-64">
                    <table className="min-w-full text-xs">
                      <thead className="bg-secondary/50 sticky top-0">
                        <tr>
                          {headers.map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-secondary/20">
                            {headers.map((h) => (
                              <td key={h} className="px-2 py-1 whitespace-nowrap text-muted-foreground">
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleImport} disabled={!file} loading={isPending}>
            Importuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
