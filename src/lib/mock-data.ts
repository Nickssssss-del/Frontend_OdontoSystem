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
  /** Foto de perfil real (Cloudinary); si no hay, se muestran las iniciales. */
  fotoUrl?: string | null | undefined;
  /** Coordenadas reales GPS (si el consultorio las tiene configuradas) */
  latitud?: number | null | undefined;
  longitud?: number | null | undefined;
};

export const soles = (n: number) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
