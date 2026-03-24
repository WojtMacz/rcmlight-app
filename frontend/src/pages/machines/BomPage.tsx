import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Download, Upload, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BomProgressBar } from '@/components/bom/BomProgressBar';
import { BomTree } from '@/components/bom/BomTree';
import { MachineModal } from '@/components/bom/modals/MachineModal';
import { ImportModal } from '@/components/bom/modals/ImportModal';
import { useMachineWithBOM, useUpdateMachine, useImportBom } from '@/hooks/useBom';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function BomPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const id = machineId ?? '';

  const { data: machine, isLoading, isError } = useMachineWithBOM(id);

  const [machineModal, setMachineModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const updateMachine = useUpdateMachine(id);
  const importBom = useImportBom(id);

  async function handleExport() {
    setIsExporting(true);
    try {
      const response = await api.get(`/machines/${id}/export-bom`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BOM_${machine?.number ?? id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Błąd podczas eksportu BOM');
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !machine) {
    return (
      <div className="rounded-lg border border-destructive/30 p-6 text-center text-sm text-destructive">
        Nie udało się załadować struktury BOM.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress stats */}
      <BomProgressBar machine={machine} />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMachineModal(true)}
          className="gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edytuj maszynę
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportModal(true)}
          className="gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          Importuj z Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          loading={isExporting}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Eksportuj do Excel
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => document.getElementById('bom-add-system-trigger')?.click()}
        >
          <Plus className="h-3.5 w-3.5" />
          Dodaj System
        </Button>
      </div>

      {/* BOM Tree */}
      <BomTree machine={machine} />

      {/* Modals */}
      <MachineModal
        open={machineModal}
        onOpenChange={setMachineModal}
        defaultValues={machine}
        isPending={updateMachine.isPending}
        onSubmit={(data) =>
          updateMachine.mutate(data as Record<string, unknown>, {
            onSuccess: () => setMachineModal(false),
          })
        }
      />

      <ImportModal
        open={importModal}
        onOpenChange={setImportModal}
        isPending={importBom.isPending}
        onImport={(fd) =>
          importBom.mutate(fd, { onSuccess: () => setImportModal(false) })
        }
      />
    </div>
  );
}
