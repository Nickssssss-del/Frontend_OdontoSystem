export const Route = createFileRoute("/dentist/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Consulta y actualiza tu perfil profesional en OdontoSystem.",
      },
    ],
  }),
  component: PerfilOdontologo,
});

function PerfilOdontologo() {
  const { usuario: sesion } = useAppState();
  const esOdontologo = sesion?.rol === "ODONTOLOGO";
  const [usuario, setUsuario] = React.useState<UsuarioYo | null>(null);
  const [miPerfil, setMiPerfil] = React.useState<MiPerfilOdontologo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [editando, setEditando] = React.useState(false);
  const [intento, setIntento] = React.useState(0);
  const queryClient = React.useContext(ReactQueryContext);

  React.useEffect(() => {
    if (!esOdontologo) {
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(null);
    Promise.all([usuariosApi.yo(), miPerfilApi.obtener()])
      .then(([cuenta, perfil]) => {
        if (!vigente) return;
        setUsuario(cuenta);
        setMiPerfil(perfil);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(mensajeDeError(err, "No se pudo cargar tu perfil profesional."));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [esOdontologo, intento]);

  const perfil = miPerfil?.perfil;
  const especialidades = perfil?.especialidades.map((e) => e.nombre).filter(Boolean) ?? [];
  const foto = usuario?.foto_perfil_url ?? perfil?.foto_url ?? null;

  // UseQuery for citas with correct range
  const { data: citasData, isLoading: isLoadingCitas } = useQuery({
    queryKey: ["odontologo-citas", miPerfil?.id, obtenerRangoAgendaValida().desde, obtenerRangoAgendaValida().hasta],
    queryFn: () => miPerfilApi.citas(obtenerRangoAgendaValida().desde, obtenerRangoAgendaValida().hasta),
    enabled: !!odontologoId,
  });

  const odontologo = miPerfil?.perfil;
  const citasData = citasData ?? [];
  const atenciones = miPerfil?.historias?.map((historia) => ({
    servicio: historia.servicio,
    fecha_cita: historia.fecha_cita,
  })) ?? [];

  const resenas = resenas ?? [];

  return (
    <AppShell>
      {cargando ? (
        <EsqueletoPaginaPerfil />
      ) : error ? (
        <AvisoError mensaje={error} onReintentar={() => setIntento((n) => n + 1)} />
      ) : !usuario || !miPerfil || !perfil ? (
        <AvisoError
          mensaje="No se encontró tu perfil profesional."
          onReintentar={() => setIntento((n) => n + 1)}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <header>
            <p className="flex items-center gap-2 text-sm text-primary">
              <Stethoscope className="size-4" /> Cuenta profesional
            </p>
            <h1 className="font-display text-3xl font-semibold">Mi perfil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Datos de contacto, consultorio y un resumen de tu actividad.
            </p>
          </header>

          <Card className="overflow-hidden rounded-3xl border-mint/50">
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <AvatarPerfil
                nombre={usuario.name_completo}
                fotoUrl={foto}
                onCambio={(url) =>
                  setUsuario((prev) => (prev ? { ...prev, foto_perfil_url: url } : prev))
                }
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold">{usuario.name_completo}</h2>
                  {especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {especialidades.map((nombre) => (
                        <Badge key={nombre} variant="secondary" className="rounded-full">
                          {nombre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 break-all text-sm text-muted-foreground">
                    <Mail className="size-4 shrink-0" /> {usuario.correo}
                  </p>
                </div>
                {!editando && (
                  <Button
                    type="button"
                    onClick={() => setEditando(true)}
                    className="rounded-xl sm:shrink-0"
                  >
                    <Pencil className="size-4" /> Editar perfil
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </Card>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">Resumen de actividad</h2>
          <ResumenOdontologo
            odontologoId={odontologoId}
            odontologo={odontologo}
            citas={citasData ?? []}
            atenciones={atenciones ?? []}
            resenas={resenas ?? []}
            ErrorResenas={errorResenas ? (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>No se pudieron cargar las reseñas.</span>
                <Button variant="outline" size="sm" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>
              </div>
            ) : null}
        </section>
      </motion.div>
    </AppShell>
  );
}
