import * as React from "react";
import { BadgeCheck, FileCheck2, FileText, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Document, DocumentStatus, DocumentType } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const statusStyles: Record<DocumentStatus, string> = {
  PENDIENTE: "border-border bg-muted text-muted-foreground",
  OBSERVADO: "border-warning/40 bg-warning/15 text-warning-foreground",
  RECHAZADO: "border-destructive/40 bg-destructive/10 text-destructive",
  VERIFICADO: "border-success/40 bg-success/15 text-success-foreground",
};
const descriptions: Record<DocumentType, string> = {
  DNI: "Documento de identidad vigente",
  Título: "Título profesional de odontología",
  Colegiatura: "Constancia de colegiatura COP",
  CV: "Currículum profesional actualizado",
};

export function VerificacionCOP({ documentos, onChange }: { documentos: Document[]; onChange: React.Dispatch<React.SetStateAction<Document[]>> }) {
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const timers = React.useRef<number[]>([]);
  React.useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const upload = (documento: Document, file?: File) => {
    if (!file) return;
    onChange((prev) => prev.map((item) => item.type === documento.type ? { ...item, estado: "PENDIENTE", motivoRechazo: undefined } : item));
    toast.info(`${documento.type} enviado`, { description: "El System Job del COP iniciará la verificación automática." });
    // Simula la integración real con la API/scraping del COP vía System Job, sin intervención humana.
    timers.current.push(window.setTimeout(() => {
      const estado: DocumentStatus = Math.random() > 0.35 ? "VERIFICADO" : "OBSERVADO";
      onChange((prev) => prev.map((item) => item.type === documento.type ? { ...item, estado, motivoRechazo: estado === "OBSERVADO" ? "El archivo requiere una imagen más nítida." : undefined } : item));
      toast.success(estado === "VERIFICADO" ? "Colegiatura validada automáticamente por el COP" : `${documento.type} observado por el COP`);
    }, 2500));
  };

  return <Card>
    <CardHeader><CardTitle className="font-display text-xl">Documentación</CardTitle><p className="text-sm text-muted-foreground">Mantén tus documentos vigentes para aparecer como COP verificado.</p></CardHeader>
    <CardContent className="grid gap-3 md:grid-cols-2">
      {documentos.map((documento) => {
        const reupload = documento.estado === "OBSERVADO" || documento.estado === "RECHAZADO";
        return <div key={documento.type} className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></span><div><p className="font-medium">{documento.type}</p><p className="text-xs text-muted-foreground">{descriptions[documento.type]}</p></div></div><Badge className={cn("shrink-0", statusStyles[documento.estado])}>{documento.estado === "VERIFICADO" && <BadgeCheck className="mr-1 size-3.5" />}{documento.estado}</Badge></div>
          {reupload && <p className="mt-3 rounded-xl bg-warning/10 p-2 text-xs text-warning-foreground">Motivo: {documento.motivoRechazo ?? "Observación pendiente de especificación"}</p>}
          <input ref={(element) => { inputRefs.current[documento.type] = element; }} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => upload(documento, event.target.files?.[0])} />
          {(reupload || documento.estado === "PENDIENTE") && <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => inputRefs.current[documento.type]?.click()}>{reupload ? <RefreshCw className="mr-2 size-4" /> : <Upload className="mr-2 size-4" />}{reupload ? "Volver a subir" : "Subir documento"}</Button>}
          {documento.estado === "VERIFICADO" && <p className="mt-3 flex items-center gap-1.5 text-xs text-success-foreground"><FileCheck2 className="size-3.5" /> Documento validado</p>}
        </div>;
      })}
    </CardContent>
  </Card>;
}
