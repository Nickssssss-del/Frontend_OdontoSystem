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

  if (!respuesta.ok) {
    let mensaje: string | undefined;
    try {
      const error = (await respuesta.json()) as { mensaje?: string };
      mensaje = error.mensaje;
    } catch {
      // El cuerpo no era JSON.
    }
    throw new ApiError(
      respuesta.status,
      mensaje ?? mensajePorEstado[respuesta.status] ?? "Ocurrió un error inesperado.",
    );
  }

  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
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
};
