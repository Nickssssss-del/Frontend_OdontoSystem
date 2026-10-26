import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  guardarArchivo,
  liquidacionesApi,
  type EstadoLiquidacion,
  type MisIngresos,
} from "@/lib/api";
import { fechaHora, mensajeDe, soles } from "@/lib/formato";

export const Route = createFileRoute("/dentist/liquidaciones")({
  head: () => ({ meta: [{ title: "Liquidaciones | OdontoSystem Odontólogo" }] }),
  component: DentistLiquidaciones,
});

const ETIQUETA: Record<EstadoLiquidacion, string> = {
  PENDIENTE: "En custodia",
  LIQUIDADA: "Pagada",
  CANCELADA: "Devuelta al paciente",
};

function DentistLiquidaciones() {
  const [datos, setDatos] = React.useState<MisIngresos | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [exportando, setExportando] = React.useState(false);

  const descargarExcel = async () => {
    setExportando(true);
    try {
      guardarArchivo(await liquidacionesApi.excel(), "mis-ingresos-odontosystem.xlsx");
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setExportando(false);
    }
  };

  const cargar = React.useCallback(async () => {
    setError(null);
    try {
      setDatos(await liquidacionesApi.mias());
    } catch (e) {
      setError(mensajeDe(e));
    }
  }, []);
  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  const resumen: [string, number | undefined, string][] = [
    [
      "En custodia",
      datos?.en_custodia,
      "Se paga 72 h después de la cita, salvo reclamo o apelación pendiente.",
    ],
    ["Pagado", datos?.pagado, "Ya transferido a tu cuenta (simulado)."],
    ["Devuelto a pacientes", datos?.devuelto_a_pacientes, "Depósitos que terminaron devueltos."],
  ];

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold">Liquidaciones</h1>
          <p className="text-muted-foreground">Tus ingresos por los depósitos de las citas.</p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={exportando || !datos}
          onClick={() => void descargarExcel()}
        >
          {exportando ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 size-4" aria-hidden="true" />
          )}
          Descargar Excel
        </Button>
      </div>

      {error && (
        <p className="mb-6 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </p>
      )}
      {!datos && !error && <Loader2 className="size-5 animate-spin text-muted-foreground" />}

      {datos && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {resumen.map(([titulo, valor, ayuda]) => (
              <Card key={titulo}>
                <CardHeader>
                  <CardDescription>{titulo}</CardDescription>
                  <CardTitle className="text-2xl">{soles(valor)}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{ayuda}</CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardContent>
              {(datos.liquidaciones ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no tienes depósitos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Cita</th>
                        <th className="py-2 pr-4 font-medium">Paciente</th>
                        <th className="py-2 pr-4 font-medium">Monto</th>
                        <th className="py-2 pr-4 font-medium">Estado</th>
                        <th className="py-2 font-medium">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(datos.liquidaciones ?? []).map((l) => (
                        <tr key={l.id} className="border-b border-border/50 align-top">
                          <td className="py-3 pr-4">
                            {l.servicio}
                            <span className="block text-xs text-muted-foreground">
                              {fechaHora(l.fecha_cita)}
                            </span>
                          </td>
                          <td className="py-3 pr-4">{l.paciente}</td>
                          <td className="py-3 pr-4 font-medium">{soles(l.monto)}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={l.estado === "LIQUIDADA" ? "default" : "outline"}>
                              {ETIQUETA[l.estado]}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {l.estado === "LIQUIDADA" &&
                              `Pagado ${fechaHora(l.liquidado_en)}${l.referencia_pago ? ` · ref. ${l.referencia_pago}` : ""}`}
                            {l.estado === "PENDIENTE" &&
                              (l.retenida_por
                                ? `Retenida por ${l.retenida_por.toLowerCase()}`
                                : `Se paga desde ${fechaHora(l.pagar_desde)}`)}
                            {l.estado === "CANCELADA" && "Depósito devuelto"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}
