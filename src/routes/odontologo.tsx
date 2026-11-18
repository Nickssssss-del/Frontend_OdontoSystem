import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { destinoLegacyOdontologo } from "@/lib/nav-dentista";

export const Route = createFileRoute("/odontologo")({
  head: () => ({
    meta: [
      { title: "Odontólogo | OdontoSystem" },
      {
        name: "description",
        content: "El panel del odontólogo está en el módulo de atención.",
      },
    ],
  }),
  component: OdontologoLegacy,
});

/** La agenda antigua con datos de ejemplo ya no se usa. La configuración sigue colgando de esta ruta. */
function OdontologoLegacy() {
  const { pathname } = useLocation();
  const destino = destinoLegacyOdontologo(pathname);
  if (destino) return <Navigate to={destino} replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
