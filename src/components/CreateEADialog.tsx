
import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

interface CreateEADialogProps {
  accountId: string;
  onSuccess: (ea: any) => void;
}

export const CreateEADialog = memo(function CreateEADialog({ accountId, onSuccess }: CreateEADialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [magic, setMagic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name) {
      alert("Introduce un nombre");
      return;
    }
    const magicNum = parseInt(magic);
    if (!magic || isNaN(magicNum)) {
      alert("Número Mágico inválido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/eas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, magicNumber: magicNum }),
      });
      const data = await res.json();
      
      if (data.success) {
         onSuccess(data.ea);
         setName("");
         setMagic("");
         setIsOpen(false);
      } else {
         alert(data.message || "Error creando EA");
      }
    } catch (error) {
      console.error("Error creating EA:", error);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-secondary/50 border-secondary">
          <Plus className="h-4 w-4" /> Nuevo EA
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Registrar Nuevo EA</AlertDialogTitle>
          <AlertDialogDescription>
            Asocia un nombre a un Número Mágico para rastrear sus estadísticas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del EA</Label>
            <Input 
              id="name" 
              placeholder="Ej: Scalper Pro" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="magic">Número Mágico</Label>
            <Input 
              id="magic" 
              placeholder="Ej: 123456" 
              type="number"
              value={magic}
              onChange={e => setMagic(e.target.value)} 
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar EA
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
