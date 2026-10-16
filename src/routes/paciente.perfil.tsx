import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authApi, usuariosApi, ApiError } from "@/lib/api";

export const Route = createFileRoute("/paciente/perfil")({
  component: PerfilPaciente,
});

function PerfilPaciente() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = React.useState(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    authApi
      .yo()
      .then((u) => {
        if (mounted) {
          setUsuario(u);
        }
      })
      .catch((err) => {
        if (mounted) {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            navigate({ to: "/" });
          } else {
            setError("Error al cargar el perfil");
          }
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!usuario) {
    return <div>No se encontró el perfil</div>;
  }

  const tipoDocumentoLabel = usuario.tipo_documento === "DNI" ? "DNI" : "C.E.";

  return (
    <div>
      <h1>Perfil de Paciente</h1>
      <p>Nombre: {usuario.nombre_completo}</p>
      <p>Correo: {usuario.correo}</p>
      <p>Teléfono: {usuario.telefono}</p>
      <p>Tipo de documento: {tipoDocumentoLabel}</p>
      <p>Número de documento: {usuario.numero_documento}</p>
    </div>
  );
}