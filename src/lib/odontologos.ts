/**
 * Convierte los datos reales del backend al formato que ya usan las tarjetas y el mapa (tipo Dentist),
 * para no tener que rehacer el diseño. También tiene las utilidades de fechas en hora de Lima.
 */
import type { OdontologoTarjeta, PerfilOdontologo } from "@/lib/api";
import type { Dentist } from "@/lib/mock-data";

const TINTES = [
  "from-primary/25 to-accent/40",
  "from-chart-2/30 to-primary/25",
  "from-accent/40 to-chart-3/30",
  "from-chart-4/30 to-primary/20",
  "from-primary/25 to-chart-2/30",
  "from-chart-5/30 to-accent/30",
];

/** Posición aproximada (0-100) de cada distrito dentro del mapa estilizado de Ica. */
const PINES_DISTRITO: Record<string, { x: number; y: number }> = {
  "ica centro": { x: 34, y: 30 },
  ica: { x: 34, y: 30 },
  parcona: { x: 74, y: 24 },
  "la tinguina": { x: 62, y: 62 },
  subtanjalla: { x: 22, y: 12 },
  "san juan bautista": { x: 12, y: 22 },
  "los aquijes": { x: 58, y: 82 },
  pachacutec: { x: 70, y: 86 },
  salas: { x: 10, y: 8 },
  santiago: { x: 44, y: 88 },
  tate: { x: 86, y: 74 },
};

/** Coordenadas geográficas reales (lat, lng) de los distritos de Ica, Perú */
export const COORDENADAS_DISTRITO_ICA: Record<string, { lat: number; lng: number }> = {
  "ica centro": { lat: -14.06777, lng: -75.72861 },
  ica: { lat: -14.06777, lng: -75.72861 },
  parcona: { lat: -14.0531, lng: -75.7042 },
  "la tinguina": { lat: -14.0381, lng: -75.7144 },
  subtanjalla: { lat: -14.0189, lng: -75.7592 },
  "san juan bautista": { lat: -14.0136, lng: -75.7364 },
  "los aquijes": { lat: -14.0956, lng: -75.6908 },
  pachacutec: { lat: -14.15, lng: -75.69 },
  salas: { lat: -13.9875, lng: -75.7878 },
  santiago: { lat: -14.18, lng: -75.71 },
  tate: { lat: -14.135, lng: -75.7 },
  "pueblo nuevo": { lat: -14.1167, lng: -75.7167 },
};

export const sinTildes = (texto: string) =>
  texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export function iniciales(nombre: string): string {
  const partes = nombre
    .replace(/^(dra?\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "OD";
}

function pin(distrito: string | null, indice: number): { x: number; y: number } {
  const base = PINES_DISTRITO[sinTildes(distrito ?? "")] ?? { x: 50, y: 50 };
  // Separa un poco a los odontólogos del mismo distrito para que los pines no se tapen.
  const desplazamiento = ((indice * 37) % 9) - 4;
  return {
    x: Math.min(95, Math.max(5, base.x + desplazamiento)),
    y: Math.min(92, Math.max(8, base.y + (((indice * 53) % 7) - 3))),
  };
}

export function tarjetaADentist(t: OdontologoTarjeta, indice: number): Dentist {
  return {
    id: t.id,
    name: t.nombre,
    specialty: t.especialidades[0] ?? "Odontología general",
    specialties: t.especialidades,
    cop: "",
    verified: true, // el buscador solo devuelve odontólogos VERIFICADOS
    rating: Number(t.calificacion ?? 0),
    reviews: t.total_resenas ?? 0,
    price: Number(t.precio_desde ?? 0),
    district: t.distrito ?? "Ica",
    distanceKm: t.distancia_km ?? 0,
    initials: iniciales(t.nombre),
    tint: TINTES[indice % TINTES.length] ?? TINTES[0]!,
    services: [],
    bio: t.consultorio ?? "",
    pin: pin(t.distrito, indice),
    fotoUrl: t.foto_url,
  };
}

export function perfilADentist(p: PerfilOdontologo): Dentist {
  const servicios = p.servicios.filter((s) => s.activo);
  const precios = servicios.map((s) => Number(s.precio_total));
  return {
    id: p.id,
    name: p.nombre,
    specialty: p.especialidades[0]?.nombre ?? "Odontología general",
    specialties: p.especialidades.map((e) => e.nombre),
    cop: p.numero_colegiatura ?? "",
    verified: p.colegiatura_verificada,
    rating: Number(p.calificacion ?? 0),
    reviews: p.total_resenas ?? 0,
    price: precios.length ? Math.min(...precios) : 0,
    district: p.distrito ?? "Ica",
    distanceKm: 0,
    initials: iniciales(p.nombre),
    tint: TINTES[0]!,
    services: servicios.map((s) => ({ name: s.titulo, price: Number(s.precio_total) })),
    bio: [p.consultorio, p.direccion].filter(Boolean).join(" · "),
    pin: pin(p.distrito, 0),
    fotoUrl: p.foto_url,
    latitud: p.latitud,
    longitud: p.longitud,
  };
}

// ---------------------------------------------------------------------------
// Fechas en hora de Lima (los turnos del backend vienen con -05:00)
// ---------------------------------------------------------------------------
const ZONA = "America/Lima";

/** YYYY-MM-DD de hoy + n días, en hora de Lima. */
export function fechaLima(diasDesdeHoy = 0): string {
  const d = new Date(Date.now() + diasDesdeHoy * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** El backend rechaza rangos de agenda mayores a 62 días (`hasta` es exclusivo). */
export const AGENDA_MAX_DIAS = 62;

/**
 * Rango válido para GET /api/odontologos/yo/citas: `diasAtras` hacia atrás y `diasAdelante` hacia
 * adelante desde hoy (hora de Lima). Por defecto 14 + 45 = 59 días. Si la suma supera
 * AGENDA_MAX_DIAS se recorta primero el tramo futuro, para no pedir un rango que el backend rechaza.
 */
export function rangoAgenda(diasAtras = 14, diasAdelante = 45): { desde: string; hasta: string } {
  const atras = Math.min(Math.max(0, Math.floor(diasAtras)), AGENDA_MAX_DIAS);
  const adelante = Math.min(Math.max(0, Math.floor(diasAdelante)), AGENDA_MAX_DIAS - atras);
  return { desde: fechaLima(-atras), hasta: fechaLima(adelante) };
}

/** Los próximos `cantidad` días (YYYY-MM-DD) empezando hoy. */
export const proximosDias = (cantidad = 7) =>
  Array.from({ length: cantidad }, (_, i) => fechaLima(i));

/** "08:30" a partir de un instante ISO con zona. */
export const horaDe = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

/** Partes para dibujar el botón de un día: "Mar", "20", "Oct". */
export function partesDia(fecha: string) {
  const d = new Date(`${fecha}T12:00:00-05:00`);
  const parte = (opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, ...opciones }).format(d).replace(".", "");
  const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  return {
    dia: capital(parte({ weekday: "short" })),
    numero: parte({ day: "numeric" }),
    mes: capital(parte({ month: "short" })),
  };
}

/** "martes 20 de octubre" */
export const fechaLarga = (fecha: string) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${fecha}T12:00:00-05:00`));

/** YYYY-MM-DD (hora de Lima) de un instante ISO. */
export const fechaDe = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
