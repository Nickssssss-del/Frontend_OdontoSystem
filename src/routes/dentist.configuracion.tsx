import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ConfiguracionOdontologo } from "@/routes/odontologo.configuracion";

export const Route = createFileRoute("/dentist/configuracion")({
  head: () => ({
    meta: [{ title: "Configuración del odontólogo | OdontoSystem" }],
  }),
  component: ConfiguracionDentista,
});

function ConfiguracionDentista() {
  return (
    <AppShell>
      <ConfiguracionOdontologo />
    </AppShell>
  );
}
