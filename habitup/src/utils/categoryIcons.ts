import type { LucideIcon } from 'lucide-react-native';
import {
  Ruler,        // reformas integrales — plano
  Bath,         // baños
  ChefHat,      // cocinas
  PaintRoller,  // pintura
  Droplets,     // fontanería
  Zap,          // electricidad
  Hammer,       // carpintería
  Snowflake,    // climatización
  BrickWall,    // albañilería
  Layers,       // suelos
  Leaf,         // jardinería
  Sparkles,     // limpieza
  Truck,        // mudanzas
  Blinds,       // persianas y ventanas
  Wrench,       // manitas
  KeyRound,     // cerrajeria
  GlassWater,   // cristaleria
  Sofa,         // muebles / montaje
  Bug,          // plagas
  Sun,          // energia solar
  Trash2,       // desescombro
  House,        // tejados / cubiertas
  HardHat,      // fallback genérico de obra
} from 'lucide-react-native';

/**
 * Iconografía técnica de HabitUp.
 *
 * Un icono por especialidad, trazo uniforme, estilo esquema de instalación.
 * Esta iconografía ES el lenguaje visual de la app: no añadas adornos por
 * encima de ella.
 *
 * Las claves son los `slug` REALES de la tabla `categories` (ver
 * `supabase/seed.sql`). Si añades una categoría al seed, añádela también aquí
 * o saldrá con el casco genérico.
 */
const ICONS_BY_SLUG: Record<string, LucideIcon> = {
  'reformas-integrales': Ruler,
  banos:                 Bath,
  cocinas:               ChefHat,
  pintura:               PaintRoller,
  fontaneria:            Droplets,
  electricidad:          Zap,
  carpinteria:           Hammer,
  climatizacion:         Snowflake,
  albanileria:           BrickWall,
  suelos:                Layers,
  jardineria:            Leaf,
  limpieza:              Sparkles,
  mudanzas:              Truck,
  'persianas-ventanas':  Blinds,
  manitas:               Wrench,
  cerrajeria:            KeyRound,
  cristaleria:           GlassWater,
  muebles:               Sofa,
  montaje:               Sofa,
  plagas:                Bug,
  'energia-solar':       Sun,
  solar:                 Sun,
  desescombro:           Trash2,
  escayola:              BrickWall,
  aislamiento:           BrickWall,
  domotica:              Zap,
  piscinas:              Droplets,
  tejados:               House,
  cubiertas:             House,
};

/** Devuelve el icono de una especialidad, con fallback de obra genérico. */
export function getCategoryIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return HardHat;
  return ICONS_BY_SLUG[slug] ?? HardHat;
}

/** Grosor de trazo unificado en toda la iconografía. No cambiar por capricho. */
export const ICON_STROKE_WIDTH = 1.5;
