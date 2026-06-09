declare module "lucide-react" {
  import * as React from "react";

  export type LucideProps = React.SVGAttributes<SVGSVGElement> & {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  };

  export type LucideIcon = React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;

  export const AlertTriangle: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const CalendarClock: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const Cloud: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Copy: LucideIcon;
  export const Download: LucideIcon;
  export const Eye: LucideIcon;
  export const History: LucideIcon;
  export const Home: LucideIcon;
  export const Hospital: LucideIcon;
  export const Info: LucideIcon;
  export const PackageCheck: LucideIcon;
  export const PackageOpen: LucideIcon;
  export const Pencil: LucideIcon;
  export const Plus: LucideIcon;
  export const Printer: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Save: LucideIcon;
  export const Settings: LucideIcon;
  export const Share2: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Trash2: LucideIcon;
  export const Upload: LucideIcon;
  export const X: LucideIcon;
}
