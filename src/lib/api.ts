/**
 * Cliente único para hablar con el backend de OdontoSystem (Spring Boot).
 *
 * - La URL del backend sale de la variable VITE_API_URL (ver .env.example);
 *   si no está definida, se usa el backend publicado en Railway.
 * - El JSON va en snake_case, igual que en el backend y en Swagger:
 *   https://odontosystem-production.up.railway.app/swagger-ui.html
 * - Guarda la sesión (access_token + refresh_token) en el navegador y la manda
 *   en el header Authorization. Si el access_token vence (dura 15 min), pide uno
 *   nuevo a /api/auth/refresh y repite la llamada una vez.
 */

const API_URL = (
  import.meta.env["VITE_API_URL"] ?? "https://odontosystem-production.up.railway.app"
).replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Tipos del contrato (mismos nombres que en Swagger)
// ---------------------------------------------------------------------------
export type Rol = "PACIENTE" | "ODONTOLOGO";

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  rol: Rol;
  nombre_completo: string;
};

export type RegistroRequest = {
  numero_documento: string;
  tipo_documento: "DNI" | "CE";
  nombre_completo: string;
  telefono: string;
  correo: string;
  password: string;
  rol: Rol;
  numero_colegiatura?: string;
  /** RNF07 / Ley 29733: el backend rechaza el registro si no llega en true. */
  acepta_privacidad: boolean;
};

export type TipoRespuestaChatbot =
  "texto_simple" | "lista_odontologos" | "lista_horarios" | "confirmacion";

export type OdontologoResumen = {
  id: string;
  nombre: string;
  consultorio?: string;
  distrito?: string;
  calificacion?: number;
  total_resenas?: number;
};

export type RespuestaChatbot = {
  sesion_id: string;
  tipo: TipoRespuestaChatbot;
  mensaje: string;
  intencion?: string;
  datos?: unknown;
  acciones?: string[];
};

export type MensajeHistorial = {
  emisor: "USUARIO" | "BOT" | "AGENTE";
  texto: string;
  intencion?: string;
  creado_en: string;
};

// ---------------------------------------------------------------------------
// Sesión guardada en el navegador
// ---------------------------------------------------------------------------
export type Sesion = AuthResponse;

const CLAVE_SESION = "odontosystem.sesion";
const EVENTO_SESION = "odontosystem:sesion";

const enNavegador = () => typeof window !== "undefined";

export function leerSesion(): Sesion | null {
  if (!enNavegador()) return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_SESION);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion | null) {
  if (!enNavegador()) return;
  try {
    if (sesion) window.localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else window.localStorage.removeItem(CLAVE_SESION);
  } catch {
    // Sin almacenamiento (modo privado estricto): la sesión dura mientras la pestaña esté abierta.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_SESION));
}

/** Avisa cuando la sesión cambia (login, logout o token vencido sin poder renovarse). */
export function alCambiarSesion(callback: () => void): () => void {
  if (!enNavegador()) return () => {};
  window.addEventListener(EVENTO_SESION, callback);
  return () => window.removeEventListener(EVENTO_SESION, callback);
}

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const mensajePorEstado: Record<number, string> = {
  0: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  400: "Revisa los datos ingresados.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "Tu sesión expiró. Vuelve a iniciar sesión.",
  404: "No encontramos lo que buscabas.",
  409: "Ese dato ya está registrado.",
  500: "Ocurrió un error en el servidor. Inténtalo en unos minutos.",
};

// ---------------------------------------------------------------------------
// Llamada base
// ---------------------------------------------------------------------------
type Opciones = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** false para endpoints públicos (login, registro, refresh). */
  conToken?: boolean;
};

let renovacionEnCurso: Promise<boolean> | null = null;

async function renovarToken(): Promise<boolean> {
  const sesion = leerSesion();
  if (!sesion?.refresh_token) return false;
  // Si varias llamadas vencen a la vez, todas esperan la misma renovación.
  renovacionEnCurso ??= (async () => {
    try {
      const nueva = await llamar<AuthResponse>("/api/auth/refresh", {
        method: "POST",
        body: { refresh_token: sesion.refresh_token },
        conToken: false,
      });
      guardarSesion(nueva);
      return true;
    } catch {
      guardarSesion(null);
      return false;
    } finally {
      renovacionEnCurso = null;
    }
  })();
  return renovacionEnCurso;
}

/** Traduce una respuesta fallida del backend en un ApiError con mensaje legible. */
async function errorDeRespuesta(respuesta: Response): Promise<ApiError> {
  let mensaje: string | undefined;
  try {
    const error = (await respuesta.json()) as { mensaje?: string };
    mensaje = error.mensaje;
  } catch {
    // El cuerpo no era JSON.
  }
  return new ApiError(
    respuesta.status,
    mensaje ?? mensajePorEstado[respuesta.status] ?? "Ocurrió un error inesperado.",
  );
}

async function llamar<T>(ruta: string, opciones: Opciones = {}, reintentar = true): Promise<T> {
  const { method = "GET", body, conToken = true } = opciones;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const sesion = conToken ? leerSesion() : null;
  if (sesion) headers["Authorization"] = `Bearer ${sesion.access_token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, mensajePorEstado[0]!);
  }

  // Token vencido: se renueva una vez y se repite la llamada.
  // (Hoy el backend responde 403 cuando falta o vence el token; se acepta 401 o 403.)
  if ((respuesta.status === 401 || respuesta.status === 403) && sesion && reintentar) {
    if (await renovarToken()) return llamar<T>(ruta, opciones, false);
  }

  if (!respuesta.ok) throw await errorDeRespuesta(respuesta);

  if (respuesta.status === 204) return undefined as T;
  // Algunos endpoints responden 200 sin cuerpo: no es un error, se devuelve undefined.
  try {
    return (await respuesta.json()) as T;
  } catch {
    return undefined as T;
  }
}

// ---------------------------------------------------------------------------
// Endpoints disponibles hoy en el backend
// ---------------------------------------------------------------------------
export const authApi = {
  async login(correo: string, password: string): Promise<Sesion> {
    const sesion = await llamar<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { correo, password },
      conToken: false,
    });
    guardarSesion(sesion);
    return sesion;
  },

  async registrar(datos: RegistroRequest): Promise<Sesion> {
    const sesion = await llamar<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: datos,
      conToken: false,
    });
    guardarSesion(sesion);
    return sesion;
  },

  cerrarSesion() {
    guardarSesion(null);
  },
};

// ---------------------------------------------------------------------------
// Recuperación de contraseña (flujo público de 4 pasos)
// ---------------------------------------------------------------------------
// Contrato exigido al backend (todo queda bajo /api/auth/**, que SecurityConfig
// ya deja pasar sin token; los nombres van en snake_case como el resto de la API):
//
//   POST /api/auth/recuperar/solicitar   { correo }          -> 200  respuesta genérica (no revela si la cuenta existe)
//   POST /api/auth/recuperar/reenviar     { correo }          -> 200  respuesta genérica
//   POST /api/auth/recuperar/verificar    { correo, codigo }  -> 200  { token }  token de un solo uso y corta validez
//   POST /api/auth/recuperar/restablecer  { token, password } -> 200  marca el token como consumido
//
// El backend publicado hoy NO los expone (solo login/refresh/register) y responde
// 404; la interfaz lo informa con servicioNoDisponible() sin simular el flujo.

export type RespuestaRecuperacion = { mensaje?: string };
export type VerificacionRecuperacion = { token?: string };

export const recuperacionApi = {
  /** Paso 1: pide el código. La respuesta debe ser idéntica exista o no la cuenta. */
  solicitar(correo: string): Promise<RespuestaRecuperacion> {
    return llamar<RespuestaRecuperacion>("/api/auth/recuperar/solicitar", {
      method: "POST",
      body: { correo },
      conToken: false,
    });
  },

  /** Paso 2: reenvía el mismo código (o lo renueva) respetando el tiempo de espera. */
  reenviar(correo: string): Promise<RespuestaRecuperacion> {
    return llamar<RespuestaRecuperacion>("/api/auth/recuperar/reenviar", {
      method: "POST",
      body: { correo },
      conToken: false,
    });
  },

  /** Paso 2: valida el código y devuelve el token de un solo uso para el paso 3. */
  verificar(correo: string, codigo: string): Promise<VerificacionRecuperacion> {
    return llamar<VerificacionRecuperacion>("/api/auth/recuperar/verificar", {
      method: "POST",
      body: { correo, codigo },
      conToken: false,
    });
  },

  /** Paso 3: cambia la contraseña consumiendo el token. Nunca se envía por URL. */
  restablecer(token: string, password: string): Promise<RespuestaRecuperacion> {
    return llamar<RespuestaRecuperacion>("/api/auth/recuperar/restablecer", {
      method: "POST",
      body: { token, password },
      conToken: false,
    });
  },
};

/** true cuando el servidor aún no implementa el endpoint (404 / 405 / 501). */
export function servicioNoDisponible(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 405 || error.status === 501)
  );
}

export const chatbotApi = {
  enviarMensaje(mensaje: string, sesionId?: string): Promise<RespuestaChatbot> {
    return llamar<RespuestaChatbot>("/api/chatbot/mensaje", {
      method: "POST",
      body: { mensaje, canal: "WEB", ...(sesionId ? { sesion_id: sesionId } : {}) },
    });
  },

  historial(sesionId: string): Promise<MensajeHistorial[]> {
    return llamar<MensajeHistorial[]>(`/api/chatbot/sesiones/${sesionId}/mensajes`);
  },
};

// ---------------------------------------------------------------------------
// Odontólogos: buscador, perfil público, turnos libres y reseñas (públicos, sin login)
// ---------------------------------------------------------------------------
export type OdontologoTarjeta = {
  id: string;
  nombre: string;
  foto_url: string | null;
  consultorio: string | null;
  distrito: string | null;
  calificacion: number | null;
  total_resenas: number | null;
  especialidades: string[];
  precio_desde: number | null;
  /** Solo viene cuando se busca "cerca de mí" (lat + lng). */
  distancia_km: number | null;
};

export type Pagina<T> = {
  contenido: T[];
  pagina: number;
  tamano: number;
  total_elementos: number;
  total_paginas: number;
};

export type FiltrosBusqueda = {
  distrito?: string;
  especialidad_id?: number;
  q?: string;
  lat?: number;
  lng?: number;
  radio_km?: number;
  orden?: "calificacion" | "precio" | "distancia";
  pagina?: number;
  tamano?: number;
};

export type ServicioOdontologo = {
  id: string;
  categoria_id: number;
  categoria: string;
  titulo: string;
  descripcion: string | null;
  precio_total: number;
  monto_deposito: number;
  duracion_minutos: number;
  activo: boolean;
};

export type PerfilOdontologo = {
  id: string;
  nombre: string;
  foto_url: string | null;
  consultorio: string | null;
  direccion: string | null;
  distrito: string | null;
  latitud: number | null;
  longitud: number | null;
  numero_colegiatura: string | null;
  colegiatura_verificada: boolean;
  calificacion: number | null;
  total_resenas: number | null;
  requiere_confirmacion_manual: boolean;
  especialidades: { id: number; nombre: string }[];
  servicios: ServicioOdontologo[];
  horarios: {
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    intervalo_minutos: number | null;
  }[];
  fotos: { id: string; url: string; descripcion: string | null; orden: number }[];
};

export type Turno = { inicio: string; fin: string };

export type Disponibilidad = {
  odontologo_id: string;
  servicio_id: string;
  fecha: string;
  zona_horaria: string;
  duracion_minutos: number;
  turnos: Turno[];
};

export type ResenaPublica = {
  id: number;
  paciente: string;
  calificacion: number;
  comentario: string | null;
  creado_en: string;
};

export type ResenasOdontologo = {
  odontologo_id: string;
  calificacion: number;
  total_resenas: number;
  distribucion: Record<string, number>;
  resenas: ResenaPublica[];
};

function consulta(parametros: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== "") p.set(clave, String(valor));
  }
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}

export const odontologosApi = {
  buscar(filtros: FiltrosBusqueda = {}): Promise<Pagina<OdontologoTarjeta>> {
    return llamar<Pagina<OdontologoTarjeta>>(`/api/odontologos${consulta(filtros)}`, {
      conToken: false,
    });
  },

  perfil(id: string): Promise<PerfilOdontologo> {
    return llamar<PerfilOdontologo>(`/api/odontologos/${id}`, { conToken: false });
  },

  /** fecha en formato YYYY-MM-DD (hora de Lima). */
  disponibilidad(id: string, servicioId: string, fecha: string): Promise<Disponibilidad> {
    return llamar<Disponibilidad>(
      `/api/odontologos/${id}/disponibilidad${consulta({ servicio_id: servicioId, fecha })}`,
      { conToken: false },
    );
  },

  resenas(id: string, tamano = 5): Promise<ResenasOdontologo> {
    return llamar<ResenasOdontologo>(
      `/api/odontologos/${id}/resenas${consulta({ pagina: 0, tamano })}`,
      {
        conToken: false,
      },
    );
  },
};

// ---------------------------------------------------------------------------
// Citas: reservar y pagar el depósito (paciente con sesión)
// ---------------------------------------------------------------------------
export type EstadoCita =
  | "PENDIENTE_PAGO"
  | "PENDIENTE_CONFIRMACION"
  | "CONFIRMADA"
  | "COMPLETADA"
  | "CANCELADA_CON_REEMBOLSO"
  | "CANCELADA_SIN_REEMBOLSO"
  | "INASISTENCIA_PENALIZADA"
  | "REPROGRAMADA";

export type Cita = {
  id: string;
  estado: EstadoCita;
  inicio: string;
  fin: string;
  zona_horaria: string;
  precio: number;
  deposito_requerido: number;
  pagar_antes_de: string | null;
  odontologo: {
    id: string;
    nombre: string;
    consultorio: string | null;
    direccion: string | null;
    distrito: string | null;
  };
  servicio: { id: string; titulo: string };
};

export type MetodoPago = "TARJETA" | "YAPE" | "PLIN";

export type Pago = {
  pago_id: string;
  estado: "PENDIENTE" | "VERIFICADO" | "RECHAZADO" | "REEMBOLSADO";
  metodo: MetodoPago;
  monto: number;
  numero_operacion: string | null;
  simulado: boolean;
  cita: Cita;
};

export const citasApi = {
  /** inicio: el valor exacto de un turno de disponibilidad (con zona horaria). Queda PENDIENTE_PAGO 15 minutos. */
  reservar(odontologoId: string, servicioId: string, inicio: string): Promise<Cita> {
    return llamar<Cita>("/api/citas", {
      method: "POST",
      body: { odontologo_id: odontologoId, servicio_id: servicioId, inicio },
    });
  },

  /** Pasarela simulada (sandbox): aprueba el pago y la cita queda CONFIRMADA (o PENDIENTE_CONFIRMACION). */
  pagar(citaId: string, metodo: MetodoPago): Promise<Pago> {
    return llamar<Pago>(`/api/citas/${citaId}/pagar`, { method: "POST", body: { metodo } });
  },

  mias(): Promise<Cita[]> {
    return llamar<Cita[]>("/api/citas/mias");
  },

  /** Con 12 h o más de anticipación se devuelve el depósito (CANCELADA_CON_REEMBOLSO); si no, se pierde. */
  cancelar(citaId: string, motivo?: string): Promise<Cita> {
    return llamar<Cita>(`/api/citas/${citaId}/cancelar`, {
      method: "PATCH",
      body: motivo ? { motivo } : {},
    });
  },
};

// ---------------------------------------------------------------------------
// Reseñas del paciente (solo citas atendidas, una por cita)
// ---------------------------------------------------------------------------
export type CitaPorResenar = {
  cita_id: string;
  odontologo_id: string;
  odontologo: string;
  servicio: string;
  atendida_el: string;
};

export const resenasApi = {
  porResenar(): Promise<CitaPorResenar[]> {
    return llamar<CitaPorResenar[]>("/api/citas/por-resenar");
  },

  calificar(citaId: string, calificacion: number, comentario?: string): Promise<unknown> {
    return llamar(`/api/citas/${citaId}/resena`, {
      method: "POST",
      body: { calificacion, ...(comentario?.trim() ? { comentario: comentario.trim() } : {}) },
    });
  },
};

// ---------------------------------------------------------------------------
// Mi cuenta y perfil (paciente y odontólogo)
// ---------------------------------------------------------------------------
// GET/PATCH /api/usuarios/yo funcionan para cualquier rol autenticado. Los
// campos restringidos (correo, documento, rol, colegiatura) NUNCA se envían en
// una actualización: el formulario solo envía lo que el backend permite.
export type UsuarioYo = {
  id: string;
  nombre_completo: string;
  correo: string;
  telefono: string;
  tipo_documento: string;
  numero_documento: string;
  rol: Rol;
  foto_perfil_url: string | null;
};

/** PATCH /api/usuarios/yo — solo nombre (3..150) y teléfono (\+?\d{9,15}). */
export type ActualizarUsuarioRequest = {
  nombre_completo?: string;
  telefono?: string;
};

export type FotoPerfil = { foto_perfil_url: string };

/** GET /api/usuarios/yo/reputacion — strikes por inasistencia del paciente. */
export type ReputacionPaciente = {
  strikes: number;
  limite_strikes: number;
  estado: "EXCELENTE" | "REGULAR" | "BLOQUEADO";
  restringido_hasta: string | null;
  puede_reservar: boolean;
};

/** Historia clínica de una cita atendida (cifrada en la BD según Ley N.º 29733). */
export type HistoriaClinica = {
  id: number;
  cita_id: string;
  paciente_id: string;
  odontologo: string;
  servicio: string;
  fecha_cita: string;
  diagnostico: string;
  tratamiento: string;
  notas: string | null;
  creado_en: string;
};

const FOTO_TIPOS_ADMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const FOTO_MAXIMO_BYTES = 5 * 1024 * 1024; // el backend limita a 5 MB

/** PUT /api/usuarios/yo/foto — multipart (JPG/PNG/WEBP hasta 5 MB). */
async function subirFotoPerfil(archivo: File, reintentar = true): Promise<FotoPerfil> {
  if (!FOTO_TIPOS_ADMITIDOS.includes(archivo.type)) {
    throw new ApiError(400, "Formato no admitido: usa una imagen JPG, PNG o WEBP.");
  }
  if (archivo.size > FOTO_MAXIMO_BYTES) {
    throw new ApiError(400, "La imagen supera los 5 MB. Elige una más ligera.");
  }
  const sesion = leerSesion();
  const datos = new FormData();
  datos.append("archivo", archivo);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/api/usuarios/yo/foto`, {
      method: "PUT",
      headers: sesion ? { Authorization: `Bearer ${sesion.access_token}` } : {},
      body: datos,
    });
  } catch {
    throw new ApiError(0, mensajePorEstado[0]!);
  }

  if ((respuesta.status === 401 || respuesta.status === 403) && sesion && reintentar) {
    if (await renovarToken()) return subirFotoPerfil(archivo, false);
  }
  if (!respuesta.ok) throw await errorDeRespuesta(respuesta);
  return (await respuesta.json()) as FotoPerfil;
}

export const usuariosApi = {
  /** GET /api/usuarios/yo — identidad del usuario autenticado (cualquier rol). */
  yo(): Promise<UsuarioYo> {
    return llamar<UsuarioYo>("/api/usuarios/yo");
  },

  /** PATCH /api/usuarios/yo — actualiza los únicos campos que el backend permite. */
  actualizar(datos: ActualizarUsuarioRequest): Promise<UsuarioYo> {
    return llamar<UsuarioYo>("/api/usuarios/yo", { method: "PATCH", body: datos });
  },

  /** PUT /api/usuarios/yo/foto — reemplaza la foto de perfil (paciente u odontólogo). */
  subirFoto(archivo: File): Promise<FotoPerfil> {
    return subirFotoPerfil(archivo);
  },

  /** GET /api/usuarios/yo/reputacion — estado de strikes (solo pacientes). */
  reputacion(): Promise<ReputacionPaciente> {
    return llamar<ReputacionPaciente>("/api/usuarios/yo/reputacion");
  },
};

export const historiasApi = {
  /** GET /api/historias/mias — mis historias clínicas, la más reciente primero. */
  mias(): Promise<HistoriaClinica[]> {
    return llamar<HistoriaClinica[]>("/api/historias/mias");
  },
};

export const catalogosApi = {
  /** GET /api/catalogos/especialidades — catálogo público (para editar el perfil). */
  especialidades(): Promise<{ id: number; nombre: string }[]> {
    return llamar<{ id: number; nombre: string }[]>("/api/catalogos/especialidades", {
      conToken: false,
    });
  },
};
// ---------------------------------------------------------------------------
// Odontólogo: mi perfil de consultorio, verificación COP y resumen de actividad
// ---------------------------------------------------------------------------
export type EstadoVerificacionCopa = "PENDIENTE" | "OBSERVADO" | "VERIFICADO" | "RECHAZADO";

/** GET /api/odontologos/yo/perfil — perfil público + estado de verificación. */
export type MiPerfilOdontologo = {
  /** Mismo contrato que GET /api/odontologos/{id} (PerfilPublicoResponse). */
  perfil: PerfilOdontologo;
  estado_verificacion: EstadoVerificacionCopa;
  nota_observacion: string | null;
  ruc: string | null;
  cci: string | null;
  frecuencia_disponibilidad: "DIARIA" | "SEMANAL" | null;
  disponibilidad_actualizada_en: string | null;
};

/**
 * PATCH /api/odontologos/yo/perfil — actualización parcial: solo cambia lo que
 * se envíe y `especialidad_ids` reemplaza la lista completa. Los campos
 * restringidos (colegiatura, verificación) no forman parte de este contrato.
 */
export type ActualizarPerfilOdontologoRequest = {
  nombre_consultorio?: string;
  direccion_consultorio?: string;
  distrito_consultorio?: string;
  especialidad_ids?: number[];
};

/** Cita vista desde el odontólogo (CitaResponse + paciente). */
export type CitaOdontologo = Cita & {
  paciente?: { id: string; nombre: string; telefono?: string | null; correo?: string | null };
  motivo_cancelacion?: string | null;
  creado_en?: string;
};

export const miPerfilApi = {
  /** GET /api/odontologos/yo/perfil — incluye estado de verificación y nota. */
  obtener(): Promise<MiPerfilOdontologo> {
    return llamar<MiPerfilOdontologo>("/api/odontologos/yo/perfil");
  },

  /** PATCH /api/odontologos/yo/perfil — campos permitidos del consultorio. */
  actualizar(datos: ActualizarPerfilOdontologoRequest): Promise<MiPerfilOdontologo> {
    return llamar<MiPerfilOdontologo>("/api/odontologos/yo/perfil", {
      method: "PATCH",
      body: datos,
    });
  },

  /** GET /api/odontologos/yo/citas — desde/hasta en YYYY-MM-DD (hasta exclusivo). */
  citas(desde: string, hasta: string): Promise<CitaOdontologo[]> {
    return llamar<CitaOdontologo[]>(`/api/odontologos/yo/citas${consulta({ desde, hasta })}`);
  },

  /** GET /api/odontologos/yo/historias — historiales clínicos que registré. */
  historias(): Promise<HistoriaClinica[]> {
    return llamar<HistoriaClinica[]>("/api/odontologos/yo/historias");
  },
};


