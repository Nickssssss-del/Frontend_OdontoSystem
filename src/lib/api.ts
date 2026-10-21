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
  | "texto_simple"
  | "lista_odontologos"
  | "lista_servicios"
  | "lista_horarios"
  | "confirmacion"
  | "cita_reservada"
  | "lista_citas";

/** Botón sugerido por el chatbot (RespuestaChatbot.opciones del backend). */
export type OpcionChatbot = { etiqueta: string; accion: string; valor?: string };

/** Tarjeta de un odontólogo en una respuesta "lista_odontologos" (chatbot.OdontologoResumen). */
export type OdontologoResumen = {
  id: string;
  nombre: string;
  foto_url?: string;
  consultorio?: string;
  distrito?: string;
  calificacion?: number;
  total_resenas?: number;
  especialidades?: string[];
  precio_desde?: number;
};

export type RespuestaChatbot = {
  sesion_id: string;
  tipo: TipoRespuestaChatbot;
  mensaje: string;
  intencion?: string;
  datos?: unknown;
  acciones?: string[];
  opciones?: OpcionChatbot[];
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
  403: "No tienes permiso para esta acción.",
  404: "No encontramos lo que buscabas.",
  409: "Ese dato ya está registrado.",
  413: "El archivo supera el tamaño máximo de 5 MB.",
  429: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  500: "Ocurrió un error en el servidor. Inténtalo en unos minutos.",
  503: "El servicio no está disponible por ahora. Inténtalo en unos minutos.",
};

// ---------------------------------------------------------------------------
// Llamada base
// ---------------------------------------------------------------------------
type Opciones = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** false para endpoints públicos (login, registro, refresh). */
  conToken?: boolean;
  /** multipart/form-data (el navegador pone el boundary; no se fija Content-Type). */
  form?: FormData;
  /** true para descargas binarias (PDF): devuelve un Blob. */
  blob?: boolean;
};

let renovacionEnCurso: Promise<boolean> | null = null;

async function renovarToken(): Promise<boolean> {
  const sesion = leerSesion();
  if (!sesion?.refresh_token) {
    // Sesión guardada sin refresh token (de una versión anterior): no se puede renovar, se cierra.
    guardarSesion(null);
    return false;
  }
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
    } catch (e) {
      // Sin red (status 0) no se cierra la sesión: el refresh token sigue siendo válido.
      if (!(e instanceof ApiError && e.status === 0)) guardarSesion(null);
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
  const { method = "GET", body, conToken = true, form, blob = false } = opciones;
  const headers: Record<string, string> = { Accept: blob ? "application/pdf" : "application/json" };
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";
  const sesion = conToken ? leerSesion() : null;
  if (sesion) headers["Authorization"] = `Bearer ${sesion.access_token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: form ?? (body === undefined ? null : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError(0, mensajePorEstado[0]!);
  }

  // Token vencido: se renueva una vez y se repite la llamada.
  // El backend responde 401 cuando falta o vence el token y 403 cuando el rol no tiene permiso
  // (RespuestasSeguridad): solo el 401 se arregla renovando el token.
  if (respuesta.status === 401 && sesion && reintentar) {
    if (await renovarToken()) return llamar<T>(ruta, opciones, false);
  } else if (respuesta.status === 401 && sesion && !reintentar) {
    // Ya se renovó y el servidor sigue rechazando el token: la sesión no sirve, se cierra.
    guardarSesion(null);
  }

  if (!respuesta.ok) throw await errorDeRespuesta(respuesta);

  if (respuesta.status === 204) return undefined as T;
  if (blob) return (await respuesta.blob()) as T;
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
/** POST /api/auth/google/registro: correo y nombre salen del token de Google. */
export type GoogleRegistroRequest = {
  id_token: string;
  numero_documento: string;
  tipo_documento: "DNI" | "CE";
  telefono: string;
  rol: Rol;
  numero_colegiatura?: string;
  nombre_completo?: string;
  /** RNF07 / Ley 29733: el backend rechaza el registro si no llega en true. */
  acepta_privacidad: boolean;
};

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

  /**
   * POST /api/auth/google (RF16) — entra con el ID token de Google Sign-In.
   * 404 = no hay cuenta con ese Google: mostrar el registro y llamar a registrarConGoogle.
   */
  async entrarConGoogle(idToken: string): Promise<Sesion> {
    const sesion = await llamar<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: { id_token: idToken },
      conToken: false,
    });
    guardarSesion(sesion);
    return sesion;
  },

  /** POST /api/auth/google/registro (RF16) — 201 con la sesión. */
  async registrarConGoogle(datos: GoogleRegistroRequest): Promise<Sesion> {
    const sesion = await llamar<AuthResponse>("/api/auth/google/registro", {
      method: "POST",
      body: datos,
      conToken: false,
    });
    guardarSesion(sesion);
    return sesion;
  },

  /** Cierra la sesión en el navegador y revoca el refresh token en el backend (POST /api/auth/logout). */
  cerrarSesion() {
    const refresh = leerSesion()?.refresh_token;
    guardarSesion(null);
    if (refresh) {
      // Mejor esfuerzo: si falla, el token igual vence solo.
      void llamar<void>("/api/auth/logout", {
        method: "POST",
        body: { refresh_token: refresh },
        conToken: false,
      }).catch(() => undefined);
    }
  },
};

// ---------------------------------------------------------------------------
// Recuperación de contraseña (contrato real del backend, AuthController)
// ---------------------------------------------------------------------------
//   POST /api/auth/recuperar-password   { correo }                              -> 202 (siempre, exista o no la cuenta)
//        Envía un código de 6 dígitos al correo (vale 15 min; uno cada 60 s).
//   POST /api/auth/restablecer-password { correo, codigo, password_nueva }      -> 204
//        400 si el código es incorrecto o venció (máx. 5 intentos por código).
//        Cierra todas las sesiones abiertas de la cuenta.
// El backend NO tiene un paso "verificar código" aparte: el código se valida al restablecer.

export const recuperacionApi = {
  /** Pide (o reenvía) el código de 6 dígitos. 202 genérico: no revela si la cuenta existe. */
  solicitar(correo: string): Promise<void> {
    return llamar<void>("/api/auth/recuperar-password", {
      method: "POST",
      body: { correo },
      conToken: false,
    });
  },

  /** Cambia la contraseña con el código recibido por correo. */
  restablecer(correo: string, codigo: string, passwordNueva: string): Promise<void> {
    return llamar<void>("/api/auth/restablecer-password", {
      method: "POST",
      body: { correo, codigo, password_nueva: passwordNueva },
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
  /** `accion`/`valor`: cuando el usuario pulsa un botón (OpcionChatbot) en vez de escribir. */
  enviarMensaje(
    mensaje: string,
    sesionId?: string,
    opcion?: { accion: string; valor?: string },
  ): Promise<RespuestaChatbot> {
    return llamar<RespuestaChatbot>("/api/chatbot/mensaje", {
      method: "POST",
      body: {
        mensaje,
        canal: "WEB",
        ...(sesionId ? { sesion_id: sesionId } : {}),
        ...(opcion
          ? { accion: opcion.accion, ...(opcion.valor ? { valor: opcion.valor } : {}) }
          : {}),
      },
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
  /** Tipo de servicio (GET /api/catalogos/categorias-servicio). */
  categoria_id?: number;
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

  /** GET /api/citas/{id} — detalle de una cita (paciente u odontólogo dueño). */
  detalle(citaId: string): Promise<Cita> {
    return llamar<Cita>(`/api/citas/${citaId}`);
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

export type ResenaMia = {
  id: number;
  cita_id: string;
  odontologo_id: string;
  calificacion: number;
  comentario: string | null;
  creado_en: string;
};

export const resenasApi = {
  porResenar(): Promise<CitaPorResenar[]> {
    return llamar<CitaPorResenar[]>("/api/citas/por-resenar");
  },

  /** PATCH /api/citas/{id}/resena — corrige mi reseña (calificación 1..5, comentario hasta 1000). */
  editar(citaId: string, calificacion: number, comentario?: string): Promise<ResenaMia> {
    return llamar<ResenaMia>(`/api/citas/${citaId}/resena`, {
      method: "PATCH",
      body: { calificacion, comentario: comentario?.trim() ?? "" },
    });
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

  if (respuesta.status === 401 && sesion && reintentar) {
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
  /** POST /api/citas/{id}/historia — solo el odontólogo de una cita COMPLETADA. diagnóstico y tratamiento obligatorios. */
  registrar(
    citaId: string,
    datos: { diagnostico: string; tratamiento: string; notas?: string },
  ): Promise<HistoriaClinica> {
    return llamar<HistoriaClinica>(`/api/citas/${citaId}/historia`, {
      method: "POST",
      body: datos,
    });
  },

  /** GET /api/citas/{id}/historia — historia de una cita (paciente u odontólogo de la cita). */
  deCita(citaId: string): Promise<HistoriaClinica> {
    return llamar<HistoriaClinica>(`/api/citas/${citaId}/historia`);
  },

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

  /** GET /api/catalogos/distritos — distritos con odontólogos (para el filtro del buscador). */
  distritos(): Promise<string[]> {
    return llamar<string[]>("/api/catalogos/distritos", { conToken: false });
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
  latitud?: number;
  longitud?: number;
  especialidad_ids?: number[];
  /** true: las reservas quedan PENDIENTE_CONFIRMACION hasta que el odontólogo confirme. */
  requiere_confirmacion_manual?: boolean;
  /** Con qué frecuencia el odontólogo actualiza su disponibilidad (preferencia guardada en su perfil). */
  frecuencia_disponibilidad?: "DIARIA" | "SEMANAL";
  /** 11 dígitos; "" borra el valor. */
  ruc?: string;
  /** 20 dígitos; "" borra el valor. */
  cci?: string;
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

  /**
   * GET /api/odontologos/yo/historias?paciente_id= — historias que registré para UN paciente
   * (el backend exige paciente_id: sin él responde 400).
   */
  historias(pacienteId: string): Promise<HistoriaClinica[]> {
    return llamar<HistoriaClinica[]>(
      `/api/odontologos/yo/historias${consulta({ paciente_id: pacienteId })}`,
    );
  },
};

/** Acciones del odontólogo sobre las citas de su agenda (AgendaOdontologoController). */
export const agendaApi = {
  /** PATCH …/confirmar — PENDIENTE_CONFIRMACION → CONFIRMADA. */
  confirmar(citaId: string): Promise<CitaOdontologo> {
    return llamar<CitaOdontologo>(`/api/odontologos/yo/citas/${citaId}/confirmar`, {
      method: "PATCH",
    });
  },
  /** PATCH …/completar — CONFIRMADA → COMPLETADA (habilita historia clínica y reseña). */
  completar(citaId: string): Promise<CitaOdontologo> {
    return llamar<CitaOdontologo>(`/api/odontologos/yo/citas/${citaId}/completar`, {
      method: "PATCH",
    });
  },
  /** PATCH …/inasistencia — el paciente no llegó: strike automático. */
  inasistencia(citaId: string): Promise<CitaOdontologo> {
    return llamar<CitaOdontologo>(`/api/odontologos/yo/citas/${citaId}/inasistencia`, {
      method: "PATCH",
    });
  },
};

// ---------------------------------------------------------------------------
// Odontólogo: horario semanal y bloqueos de agenda (MiConsultorioController)
// ---------------------------------------------------------------------------
export type DiaSemana =
  "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";

/** hora_inicio / hora_fin: "HH:mm" o "HH:mm:ss". */
export type Horario = {
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos: number | null;
};

export type Bloqueo = {
  id: string;
  inicio: string;
  fin: string;
  motivo: string | null;
  citas_canceladas: number;
};

export const horariosApi = {
  /** GET /api/odontologos/yo/horarios */
  obtener(): Promise<Horario[]> {
    return llamar<Horario[]>("/api/odontologos/yo/horarios");
  },
  /** PUT /api/odontologos/yo/horarios — reemplaza TODO el horario semanal. */
  guardar(horarios: Horario[]): Promise<Horario[]> {
    return llamar<Horario[]>("/api/odontologos/yo/horarios", {
      method: "PUT",
      body: { horarios },
    });
  },
  /** GET /api/odontologos/yo/bloqueos — bloqueos vigentes y futuros. */
  bloqueos(): Promise<Bloqueo[]> {
    return llamar<Bloqueo[]>("/api/odontologos/yo/bloqueos");
  },
  /** POST /api/odontologos/yo/bloqueos — cancela con reembolso las citas dentro del rango. */
  bloquear(inicio: string, fin: string, motivo?: string): Promise<Bloqueo> {
    return llamar<Bloqueo>("/api/odontologos/yo/bloqueos", {
      method: "POST",
      body: { inicio, fin, ...(motivo ? { motivo } : {}) },
    });
  },
  /** DELETE /api/odontologos/yo/bloqueos/{id} */
  quitarBloqueo(id: string): Promise<void> {
    return llamar<void>(`/api/odontologos/yo/bloqueos/${id}`, { method: "DELETE" });
  },
};

// ===========================================================================
// Cierre del backend: lo que antes existía solo en el servidor
// ===========================================================================

// ---------------------------------------------------------------------------
// Verificación COP y documentos del odontólogo
// ---------------------------------------------------------------------------
export type EstadoVerificacion = {
  estado: EstadoVerificacionCopa;
  nota: string | null;
  intentos_fallidos: number;
  ultimo_intento: string | null;
};

export type TipoDocumento = "DNI" | "TITULO_PROFESIONAL" | "COLEGIATURA" | "CV";

/** url_temporal vence en url_expira_en: hay que volver a pedir la lista para renovarla. */
export type DocumentoOdontologo = {
  id: string;
  tipo: TipoDocumento;
  subido_en: string;
  url_temporal: string | null;
  url_expira_en: string | null;
};

export type FotoConsultorio = {
  id: string;
  url: string;
  descripcion: string | null;
  orden: number;
};

const ARCHIVO_MAXIMO_BYTES = 5 * 1024 * 1024;

function validarArchivo(archivo: File, tipos: string[], descripcionTipos: string) {
  if (!tipos.includes(archivo.type)) {
    throw new ApiError(400, `Formato no admitido: usa ${descripcionTipos}.`);
  }
  if (archivo.size > ARCHIVO_MAXIMO_BYTES) {
    throw new ApiError(400, "El archivo supera los 5 MB. Elige uno más ligero.");
  }
}

export const verificacionApi = {
  /** GET /api/odontologos/yo/verificacion */
  estado(): Promise<EstadoVerificacion> {
    return llamar<EstadoVerificacion>("/api/odontologos/yo/verificacion");
  },
  /** POST …/reintentar — solo si sigue PENDIENTE; máximo una vez cada 10 min (429). */
  reintentar(): Promise<EstadoVerificacion> {
    return llamar<EstadoVerificacion>("/api/odontologos/yo/verificacion/reintentar", {
      method: "POST",
    });
  },
};

export const documentosApi = {
  /** GET /api/odontologos/yo/documentos */
  listar(): Promise<DocumentoOdontologo[]> {
    return llamar<DocumentoOdontologo[]>("/api/odontologos/yo/documentos");
  },
  /** POST /api/odontologos/yo/documentos — multipart: tipo + archivo (PDF/JPG/PNG hasta 5 MB). */
  subir(tipo: TipoDocumento, archivo: File): Promise<DocumentoOdontologo> {
    validarArchivo(archivo, ["application/pdf", "image/jpeg", "image/png"], "un PDF, JPG o PNG");
    const form = new FormData();
    form.append("tipo", tipo);
    form.append("archivo", archivo);
    return llamar<DocumentoOdontologo>("/api/odontologos/yo/documentos", { method: "POST", form });
  },
};

export const fotosConsultorioApi = {
  /** GET /api/odontologos/yo/fotos */
  listar(): Promise<FotoConsultorio[]> {
    return llamar<FotoConsultorio[]>("/api/odontologos/yo/fotos");
  },
  /** POST /api/odontologos/yo/fotos — multipart: archivo (+ descripcion). JPG/PNG/WEBP hasta 5 MB. */
  subir(archivo: File, descripcion?: string): Promise<FotoConsultorio> {
    validarArchivo(archivo, FOTO_TIPOS_ADMITIDOS, "una imagen JPG, PNG o WEBP");
    const form = new FormData();
    form.append("archivo", archivo);
    if (descripcion?.trim()) form.append("descripcion", descripcion.trim());
    return llamar<FotoConsultorio>("/api/odontologos/yo/fotos", { method: "POST", form });
  },
  /** DELETE /api/odontologos/yo/fotos/{id} */
  eliminar(id: string): Promise<void> {
    return llamar<void>(`/api/odontologos/yo/fotos/${id}`, { method: "DELETE" });
  },
};

// ---------------------------------------------------------------------------
// Servicios del odontólogo (MiConsultorioController)
// ---------------------------------------------------------------------------
export type ServicioRequest = {
  categoria_id: number;
  titulo: string;
  descripcion?: string;
  precio_total: number;
  duracion_minutos: number;
};

export const serviciosOdontologoApi = {
  listar(): Promise<ServicioOdontologo[]> {
    return llamar<ServicioOdontologo[]>("/api/odontologos/yo/servicios");
  },
  crear(datos: ServicioRequest): Promise<ServicioOdontologo> {
    return llamar<ServicioOdontologo>("/api/odontologos/yo/servicios", {
      method: "POST",
      body: datos,
    });
  },
  actualizar(id: string, datos: ServicioRequest): Promise<ServicioOdontologo> {
    return llamar<ServicioOdontologo>(`/api/odontologos/yo/servicios/${id}`, {
      method: "PUT",
      body: datos,
    });
  },
  eliminar(id: string): Promise<void> {
    return llamar<void>(`/api/odontologos/yo/servicios/${id}`, { method: "DELETE" });
  },
};

export type CategoriaServicio = { id: number; nombre: string };

// ---------------------------------------------------------------------------
// Liquidaciones, constancia PDF y reembolsos
// ---------------------------------------------------------------------------
export type EstadoLiquidacion = "PENDIENTE" | "LIQUIDADA" | "CANCELADA";

export type Liquidacion = {
  id: string;
  cita_id: string;
  paciente: string;
  servicio: string;
  fecha_cita: string;
  estado_cita: EstadoCita;
  monto: number;
  estado: EstadoLiquidacion;
  /** Qué la retiene (reclamo o apelación pendiente), si aplica. */
  retenida_por: string | null;
  pagar_desde: string | null;
  referencia_pago: string | null;
  liquidado_en: string | null;
};

export type MisIngresos = {
  en_custodia: number;
  pagado: number;
  devuelto_a_pacientes: number;
  liquidaciones: Liquidacion[];
};

export type EstadoReembolso = "SOLICITADO" | "PROCESANDO" | "REEMBOLSADO" | "RECHAZADO" | "ERROR";

export type Reembolso = {
  id: string;
  estado: EstadoReembolso;
  monto: number;
  motivo: string | null;
  id_externo: string | null;
  solicitado_en: string;
  procesado_en: string | null;
  simulado: boolean;
};

export const liquidacionesApi = {
  /** GET /api/odontologos/yo/liquidaciones */
  mias(): Promise<MisIngresos> {
    return llamar<MisIngresos>("/api/odontologos/yo/liquidaciones");
  },
};

export const constanciaApi = {
  /** GET /api/citas/{id}/constancia — PDF. 409 si todavía no hay depósito pagado. */
  descargar(citaId: string): Promise<Blob> {
    return llamar<Blob>(`/api/citas/${citaId}/constancia`, { blob: true });
  },
};

/** Descarga un Blob como archivo desde el navegador. */
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const reembolsosApi = {
  /** GET /api/citas/{id}/reembolsos — paciente u odontólogo de la cita. */
  deCita(citaId: string): Promise<Reembolso[]> {
    return llamar<Reembolso[]>(`/api/citas/${citaId}/reembolsos`);
  },
};

// ---------------------------------------------------------------------------
// Apelaciones de inasistencia
// ---------------------------------------------------------------------------
export type EstadoApelacion = "PENDIENTE" | "APROBADA" | "RECHAZADA";

/** certificado_url es un enlace firmado que vence a los 10 min (certificado_expira_en). */
export type Apelacion = {
  id: string;
  cita_id: string;
  estado: EstadoApelacion;
  paciente: string;
  servicio: string;
  fecha_cita: string;
  certificado_url: string | null;
  certificado_expira_en: string | null;
  nota_resolucion: string | null;
  creado_en: string;
  resuelto_en: string | null;
  strikes_del_paciente: number | null;
};

export const apelacionesApi = {
  /** POST /api/citas/{id}/apelacion — paciente; certificado PDF/JPG/PNG hasta 5 MB. */
  apelar(citaId: string, certificado: File): Promise<Apelacion> {
    validarArchivo(
      certificado,
      ["application/pdf", "image/jpeg", "image/png"],
      "un PDF, JPG o PNG",
    );
    const form = new FormData();
    form.append("certificado", certificado);
    return llamar<Apelacion>(`/api/citas/${citaId}/apelacion`, { method: "POST", form });
  },
  /** GET /api/citas/{id}/apelacion — estado de mi apelación (404 si no hay). */
  deMiCita(citaId: string): Promise<Apelacion> {
    return llamar<Apelacion>(`/api/citas/${citaId}/apelacion`);
  },
  /** GET /api/odontologos/yo/apelaciones?estado= */
  delOdontologo(estado?: EstadoApelacion): Promise<Apelacion[]> {
    return llamar<Apelacion[]>(`/api/odontologos/yo/apelaciones${consulta({ estado })}`);
  },
  /** PATCH /api/odontologos/yo/apelaciones/{id} — aprobar: quita un strike y devuelve el depósito. */
  resolver(id: string, aprobar: boolean, nota?: string): Promise<Apelacion> {
    return llamar<Apelacion>(`/api/odontologos/yo/apelaciones/${id}`, {
      method: "PATCH",
      body: { aprobar, ...(nota?.trim() ? { nota: nota.trim() } : {}) },
    });
  },
};

// ---------------------------------------------------------------------------
// Libro de reclamaciones
// ---------------------------------------------------------------------------
export type TipoReclamo = "CONSULTA" | "INCIDENCIA" | "RECLAMO";
export type EstadoReclamo = "ABIERTO" | "EN_PROCESO" | "RESUELTO" | "CERRADO";

export type Reclamo = {
  id: string;
  /** REC-XXXXXXXX: número de seguimiento. */
  codigo: string;
  tipo: TipoReclamo;
  estado: EstadoReclamo;
  asunto: string;
  descripcion: string;
  reclamante: string;
  cita_id: string | null;
  odontologo: string | null;
  servicio: string | null;
  fecha_cita: string | null;
  /** ODONTOLOGO (reclamo sobre una cita) o SOPORTE. */
  atiende: "ODONTOLOGO" | "SOPORTE";
  respuesta: string | null;
  creado_en: string;
  actualizado_en: string | null;
  resuelto_en: string | null;
  /** Fecha límite de respuesta (15 días hábiles), YYYY-MM-DD. */
  responder_antes: string;
};

export const reclamosApi = {
  /** POST /api/reclamos — cita_id opcional (debe ser una cita propia). */
  registrar(datos: {
    tipo: TipoReclamo;
    asunto: string;
    descripcion: string;
    cita_id?: string;
  }): Promise<Reclamo> {
    return llamar<Reclamo>("/api/reclamos", { method: "POST", body: datos });
  },
  mios(): Promise<Reclamo[]> {
    return llamar<Reclamo[]>("/api/reclamos/mios");
  },
  detalle(id: string): Promise<Reclamo> {
    return llamar<Reclamo>(`/api/reclamos/${id}`);
  },
  cerrar(id: string): Promise<Reclamo> {
    return llamar<Reclamo>(`/api/reclamos/${id}/cerrar`, { method: "PATCH" });
  },
  /** GET /api/odontologos/yo/reclamos?estado= — bandeja del odontólogo, los más antiguos primero. */
  bandeja(estado?: EstadoReclamo): Promise<Reclamo[]> {
    return llamar<Reclamo[]>(`/api/odontologos/yo/reclamos${consulta({ estado })}`);
  },
  /** PATCH /api/odontologos/yo/reclamos/{id} — resuelto=true pasa a RESUELTO; devolver_deposito opcional. */
  responder(
    id: string,
    respuesta: string,
    resuelto: boolean,
    devolverDeposito?: boolean,
  ): Promise<Reclamo> {
    return llamar<Reclamo>(`/api/odontologos/yo/reclamos/${id}`, {
      method: "PATCH",
      body: {
        respuesta,
        resuelto,
        ...(devolverDeposito !== undefined ? { devolver_deposito: devolverDeposito } : {}),
      },
    });
  },
};

// ---------------------------------------------------------------------------
// Asistencia, agenda de hoy y reportes de ausencia
// ---------------------------------------------------------------------------
export type EstadoReporteAusencia = "PENDIENTE" | "CONFIRMADO" | "RECHAZADO" | "EN_RECLAMO";

export type RespuestaAsistencia = {
  cita_id: string;
  estado_cita: EstadoCita;
  reporte: EstadoReporteAusencia | null;
  mensaje: string;
};

export type AgendaHoy = {
  fecha: string;
  /** null: todavía no confirmaste hoy (sin confirmar no se aceptan reservas para hoy). */
  atiende: boolean | null;
  respondido_en: string | null;
  citas_hoy: number;
  primera_cita: string | null;
  citas_canceladas: number;
};

export type ReporteAusencia = {
  id: string;
  cita_id: string;
  paciente: string;
  servicio: string;
  fecha_cita: string;
  estado: EstadoReporteAusencia;
  distancia_metros: number | null;
  respuesta_odontologo: string | null;
  historia_registrada: boolean;
  responder_antes: string;
  creado_en: string;
  resuelto_en: string | null;
};

export const asistenciaApi = {
  /**
   * POST /api/citas/{id}/asistencia — paciente. atendido=true cierra la cita como atendida;
   * atendido=false reporta que no llegó el odontólogo (durante la cita se envía la ubicación, < 200 m).
   */
  responder(
    citaId: string,
    atendido: boolean,
    ubicacion?: { latitud: number; longitud: number },
  ): Promise<RespuestaAsistencia> {
    return llamar<RespuestaAsistencia>(`/api/citas/${citaId}/asistencia`, {
      method: "POST",
      body: { atendido, ...(ubicacion ?? {}) },
    });
  },
};

export const agendaHoyApi = {
  /** GET /api/odontologos/yo/agenda-hoy */
  obtener(): Promise<AgendaHoy> {
    return llamar<AgendaHoy>("/api/odontologos/yo/agenda-hoy");
  },
  /** POST — atiende=false cancela las citas pendientes de hoy con reembolso del 100 %. */
  confirmar(atiende: boolean, motivo?: string): Promise<AgendaHoy> {
    return llamar<AgendaHoy>("/api/odontologos/yo/agenda-hoy", {
      method: "POST",
      body: { atiende, ...(motivo?.trim() ? { motivo: motivo.trim() } : {}) },
    });
  },
  /** GET /api/odontologos/yo/reportes-ausencia */
  reportes(): Promise<ReporteAusencia[]> {
    return llamar<ReporteAusencia[]>("/api/odontologos/yo/reportes-ausencia");
  },
  /** POST …/{id}/respuesta — atendi=false admite la falta; atendi=true exige historia clínica registrada. */
  responderReporte(id: string, atendi: boolean, nota?: string): Promise<ReporteAusencia> {
    return llamar<ReporteAusencia>(`/api/odontologos/yo/reportes-ausencia/${id}/respuesta`, {
      method: "POST",
      body: { atendi, ...(nota?.trim() ? { nota: nota.trim() } : {}) },
    });
  },
};

// ---------------------------------------------------------------------------
// Consentimientos de privacidad (Ley N.º 29733)
// ---------------------------------------------------------------------------
export type Consentimiento = { version_politica: string; aceptado_en: string };

export const consentimientosApi = {
  /** GET /api/public/privacidad — versión vigente (sin login). */
  politica(): Promise<{ version: string }> {
    return llamar<{ version: string }>("/api/public/privacidad", { conToken: false });
  },
  /** GET /api/usuarios/yo/consentimientos */
  mios(): Promise<Consentimiento[]> {
    return llamar<Consentimiento[]>("/api/usuarios/yo/consentimientos");
  },
};

/** Catálogo de categorías de servicio (para crear servicios). */
export const categoriasApi = {
  /** GET /api/catalogos/categorias-servicio */
  listar(): Promise<CategoriaServicio[]> {
    return llamar<CategoriaServicio[]>("/api/catalogos/categorias-servicio", { conToken: false });
  },
};
