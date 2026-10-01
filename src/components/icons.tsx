import type { LucideIcon } from "lucide-react";
import {
  // Navegación
  House,
  CalendarDays,
  Salad,
  TrendingUp,
  Scale,
  Settings as SettingsIcon,
  Dumbbell,
  // Ciclo del día
  Sun,
  Moon,
  // Comidas
  Coffee,
  Croissant,
  UtensilsCrossed,
  Apple,
  Cookie,
  Soup,
  CupSoda,
  // Metas
  Beef,
  GlassWater,
  // Estados y acciones
  Check,
  CircleSlash,
  CircleCheck,
  CircleAlert,
  TriangleAlert,
  Info,
  Lightbulb,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Trash2,
  Save,
  Plus,
  RefreshCw,
  ArrowRight,
  ArrowUp,
  Share2,
  Smartphone,
  WifiOff,
  // Progreso
  Trophy,
  Medal,
  Award,
  Coins,
  Timer,
  Target,
  Zap,
  // Penaltias
  ListChecks,
  Repeat,
  Sparkles,
  ClipboardList,
  LogOut,
  Camera,
  User as UserIcon,
  Mail,
  Ruler,
  Weight,
  CalendarCheck,
  HeartPulse,
  Activity,
  Flame,
  Clock,
  Play,
  ShieldCheck,
  FileWarning,
} from "lucide-react";

/**
 * Registro central de iconos.
 *
 * Todos los iconos del proyecto salen de aquí. Lucide usa `<svg>` inline con
 * `currentColor`, así que heredan el color del texto y no requieren ninguna
 * petición extra ni fuentes.
 */
export const ICONS = {
  // Navegación
  home: House,
  calendar: CalendarDays,
  salad: Salad,
  trend: TrendingUp,
  scale: Scale,
  settings: SettingsIcon,
  dumbbell: Dumbbell,

  // Ciclo del día
  sun: Sun,
  moon: Moon,

  // Comidas
  coffee: Coffee,
  croissant: Croissant,
  meal: UtensilsCrossed,
  apple: Apple,
  cookie: Cookie,
  soup: Soup,
  shake: CupSoda,

  // Nutrientes
  beef: Beef,
  water: GlassWater,

  // Estados
  check: Check,
  checkCircle: CircleCheck,
  partial: CircleSlash,
  crossed: CircleSlash,
  alertCircle: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  bulb: Lightbulb,
  lock: Lock,
  unlock: LockOpen,
  eye: Eye,
  eyeOff: EyeOff,
  key: KeyRound,
  edit: Pencil,
  trash: Trash2,
  save: Save,
  plus: Plus,
  refresh: RefreshCw,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  share: Share2,
  smartphone: Smartphone,
  wifiOff: WifiOff,

  // Progreso
  trophy: Trophy,
  medal: Medal,
  award: Award,
  coins: Coins,
  timer: Timer,
  target: Target,
  zap: Zap,

  // Penitencias
  list: ListChecks,
  repeat: Repeat,
  sparkles: Sparkles,
  clipboard: ClipboardList,

  // Navegación / cuenta
  logout: LogOut,
  camera: Camera,
  user: UserIcon,
  mail: Mail,
  ruler: Ruler,
  weight: Weight,
  calendarCheck: CalendarCheck,
  heart: HeartPulse,
  activity: Activity,
  flame: Flame,
  clock: Clock,
  play: Play,
  shield: ShieldCheck,
  warningFile: FileWarning,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Props comunes de todos los iconos. */
export type IconProps = {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean;
};

/**
 * Renderiza un icono por nombre.
 *
 * Envolverlo aquí (en vez de importar Lucide en cada archivo) mantiene un
 * único punto de control y permite auditar qué iconos usa la app.
 */
export function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  className,
  ...rest
}: IconProps & { name: IconName }) {
  const Cmp = ICONS[name];
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden {...rest} />;
}
