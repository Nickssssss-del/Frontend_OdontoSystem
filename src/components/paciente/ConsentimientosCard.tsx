import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { consentimientosApi, type Consentimiento } from "@/lib/api";
import { fechaHora, mensajeDe } from "@/lib/formato";

/** Privacidad (Ley N.º 29733): qué versión de la política aceptaste y cuándo. Sirve para ambos roles. */
export function ConsentimientosCard() {
  const [lista, setLista] = React.useState<Consentimiento[] | null>(null);
  const [vigente, setVigente] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let vivo = true;
    Promise.all([consentimientosApi.mios(), consentimientosApi.politica()])
      .then(([mios, p]) => {
        if (!vivo) return;
        setLista(mios);
        setVigente(p.version);
      })
      .catch((e) => vivo && setError(mensajeDe(e)));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" /> Privacidad
        </CardTitle>
        <CardDescription>Política vigente{vigente ? `: versión ${vigente}` : ""}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {lista?.length === 0 && (
          <p className="text-muted-foreground">Sin consentimientos registrados.</p>
        )}
        {lista?.map((c) => (
          <p key={`${c.version_politica}-${c.aceptado_en}`}>
            Aceptaste la versión <strong>{c.version_politica}</strong> el {fechaHora(c.aceptado_en)}
            .
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
