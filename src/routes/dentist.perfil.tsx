import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authApi, usuariosApi, miPerfilApi, ApiError } from "@/lib/api";

export const Route = createFileRoute("/dentist/perfil")({
  component: PerfilOdontologo,
});

function PerfilOdontologo() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = React.useState(null);
  const [miPerfil, setMiPerfil] = React.useState(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cargandoEspecialidades, setCargandoEspecialidades] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setCargandoEspecialidades(true);
    Promise.all([
      usuariosApi.yo(),
      miPerfilApi.obtener(),
    ])
    .then(([usuarioRes, miPerfilRes]) => {
      if (mounted) {
        setUsuario(usuarioRes);
        setMiPerfil(miPerfilRes);
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
      if (mounted) {
        setLoading(false);
        setCargandoEspecialidades(false);
      }
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

  if (!usuario || !miPerfil) {
    return <div>No se encontró el perfil</div>;
  }

  const tipoDocumentoLabel = usuario.tipo_documento === "DNI" ? "DNI" : "C.E.";

  return (
    <div>
      <h1>Perfil de Odontólogo</h1>
      <p>Nombre: {usuario.nombre_completo}</p>
      <p>Correo: {usuario.correo}</p>
      <p>Teléfono: {usuario.telefono}</p>
      <p>Tipo de documento: {tipoDocumentoLabel}</p>
      <p>Número de documento: {usuario.numero_documento}</p>
      <p>Número de colegiatura: {miPerfil.perfil.numero_colegiatura}</p>
      <p>Verificado: {miPerfil.perfil.colegiatura_verificada ? "Sí" : "No"}</p>
    </div>
  );
}