export type Dentist = {
  id: string;
  name: string;
  specialty: string;
  specialties: string[];
  cop: string;
  verified: boolean;
  rating: number;
  reviews: number;
  price: number;
  district: string;
  distanceKm: number;
  initials: string;
  tint: string;
  services: { name: string; price: number }[];
  bio: string;
  /** Posición relativa (0-100) dentro del mapa estilizado de Ica */
  pin: { x: number; y: number };
};

export const especialidades = [
  "Limpieza",
  "Ortodoncia",
  "Evaluación",
  "Endodoncia",
  "Estética",
  "Odontopediatría",
] as const;

export const dentists: Dentist[] = [
  {
    id: "d1",
    name: "Dra. Claudia Manrique",
    specialty: "Ortodoncia",
    specialties: ["Ortodoncia", "Evaluación"],
    cop: "COP-24851",
    verified: true,
    rating: 4.9,
    reviews: 214,
    price: 60,
    district: "Ica Centro",
    distanceKm: 1.2,
    initials: "CM",
    tint: "from-primary/25 to-accent/40",
    services: [
      { name: "Evaluación ortodóncica", price: 60 },
      { name: "Instalación de brackets", price: 950 },
      { name: "Control mensual", price: 80 },
    ],
    bio: "Especialista en ortodoncia con 12 años atendiendo en Ica. Enfoque en tratamientos con brackets estéticos y alineadores.",
  },
  {
    id: "d2",
    name: "Dr. Renzo Palomino",
    specialty: "Endodoncia",
    specialties: ["Endodoncia", "Limpieza"],
    cop: "COP-31702",
    verified: true,
    rating: 4.7,
    reviews: 138,
    price: 45,
    district: "San Joaquín",
    distanceKm: 3.4,
    initials: "RP",
    tint: "from-chart-2/30 to-primary/25",
    services: [
      { name: "Diagnóstico de dolor", price: 45 },
      { name: "Endodoncia unirradicular", price: 350 },
      { name: "Profilaxis completa", price: 90 },
    ],
    bio: "Manejo de dolor dental y tratamientos de conducto con microscopía. Atención de urgencias el mismo día.",
  },
  {
    id: "d3",
    name: "Dra. Milagros Chávez",
    specialty: "Odontopediatría",
    specialties: ["Odontopediatría", "Limpieza", "Evaluación"],
    cop: "COP-28430",
    verified: true,
    rating: 5.0,
    reviews: 96,
    price: 50,
    district: "Parcona",
    distanceKm: 4.8,
    initials: "MC",
    tint: "from-chart-4/30 to-accent/40",
    services: [
      { name: "Consulta niños", price: 50 },
      { name: "Sellantes por pieza", price: 55 },
      { name: "Fluorización", price: 70 },
    ],
    bio: "Consultorio ambientado para niños de 2 a 12 años, con manejo conductual sin sedación.",
  },
  {
    id: "d4",
    name: "Dr. Aldo Quispe",
    specialty: "Estética",
    specialties: ["Estética", "Limpieza"],
    cop: "COP-19288",
    verified: true,
    rating: 4.6,
    reviews: 172,
    price: 70,
    district: "Ica Centro",
    distanceKm: 0.8,
    initials: "AQ",
    tint: "from-primary/30 to-chart-5/25",
    services: [
      { name: "Diseño de sonrisa (plan)", price: 70 },
      { name: "Blanqueamiento láser", price: 480 },
      { name: "Resina estética", price: 120 },
    ],
    bio: "Rehabilitación estética anterior, carillas de resina y blanqueamiento supervisado.",
  },
  {
    id: "d5",
    name: "Dra. Vanessa Loayza",
    specialty: "Limpieza",
    specialties: ["Limpieza", "Evaluación"],
    cop: "COP-35119",
    verified: true,
    rating: 4.4,
    reviews: 61,
    price: 35,
    district: "La Tinguiña",
    distanceKm: 5.9,
    initials: "VL",
    tint: "from-accent/50 to-primary/20",
    services: [
      { name: "Evaluación general", price: 35 },
      { name: "Destartraje", price: 80 },
      { name: "Aplicación de flúor", price: 45 },
    ],
    bio: "Odontología preventiva y control de placa para toda la familia.",
  },
  {
    id: "d6",
    name: "Dr. Bruno Salvatierra",
    specialty: "Ortodoncia",
    specialties: ["Ortodoncia"],
    cop: "COP-40277",
    verified: false,
    rating: 0,
    reviews: 0,
    price: 55,
    district: "Salas Guadalupe",
    distanceKm: 7.2,
    initials: "BS",
    tint: "from-muted to-muted",
    services: [{ name: "Evaluación ortodóncica", price: 55 }],
    bio: "Perfil en proceso de validación de colegiatura ante el COP.",
  },
];

export const getDentist = (id: string) => dentists.find((d) => d.id === id);

export const timeBlocks = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

export const busyBlocks: Record<string, string[]> = {
  d1: ["09:00", "11:00", "16:00"],
  d2: ["08:00", "12:00", "18:00"],
  d3: ["10:00", "15:00"],
  d4: ["09:00", "10:00", "19:00"],
  d5: ["17:00"],
  d6: [],
};

export const nextDays = (count = 7) => {
  const base = new Date(2026, 8, 15);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
};

export const diaCorto = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const mesCorto = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Oct",
  "Nov",
  "Dic",
];

export const soles = (n: number) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ingresosMensuales = [
  { mes: "Abr", ingresos: 4820 },
  { mes: "May", ingresos: 5310 },
  { mes: "Jun", ingresos: 4990 },
  { mes: "Jul", ingresos: 6240 },
  { mes: "Ago", ingresos: 7105 },
  { mes: "Set", ingresos: 5860 },
];
