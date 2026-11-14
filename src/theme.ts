import { formatearMontoEntrada, parsearMonto } from "./finance.ts";
import type { MovimientoTipo } from "./types";

export { formatearMontoEntrada, parsearMonto };

export const DEFAULT_CATEGORY_OPTIONS: Record<
  MovimientoTipo,
  readonly string[]
> = {
  gasto: ["Comer afuera", "Transporte", "Mercado", "Arriendo", "Educación", "Otros"],
  ingreso: ["Salario", "Otros"],
  traslado: ["Traslado"],
};

export function getCategoryOptions(tipo: MovimientoTipo) {
  return [...DEFAULT_CATEGORY_OPTIONS[tipo]];
}

export const colors = {
  primary: "#F4F15A",
  gold: "#F4F15A",
  mint: "#3DDC97",
  bg: "#0B1220",
  bgElevated: "#121A2C",
  card: "#171F33",
  cardSoft: "#1C2540",
  ink: "#F5F7FF",
  muted: "#8B93A7",
  danger: "#F07178",
  soft: "#222C44",
  border: "#2A3450",
  yellow: "#F4F15A",
  yellowInk: "#161B10",
  blue: "#5B8DEF",
  orange: "#FF8A4C",
  purple: "#A78BFA",
  pink: "#F472B6",
  outer: "#DCE4F0",
};

export const radii = {
  card: 22,
  pill: 999,
  phone: 36,
};

export const money = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

export const moneySigned = (n: number) => {
  const formatted = money(Math.abs(n));
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
};

export const nombreMes = (date: Date = new Date()) => {
  const raw = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const nombreDia = (date: Date) =>
  date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });

export function tiempoRelativo(iso: string, now = Date.now()) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "Sin fecha";
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "Sincronizado ahora";
  if (mins < 60) return `Sincronizado hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Sincronizado hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Sincronizado hace ${days} d`;
}

export const CATEGORY_META: Record<
  string,
  { emoji: string; color: string; label: string }
> = {
  Arriendo: { emoji: "🏠", color: "#FF8A4C", label: "Arriendo" },
  Transporte: { emoji: "🚚", color: "#5B8DEF", label: "Transporte" },
  "Comer afuera": { emoji: "🛍️", color: "#F472B6", label: "Compras" },
  Mercado: { emoji: "🛒", color: "#A78BFA", label: "Mercado" },
  Otros: { emoji: "📦", color: "#34D399", label: "Otros" },
  Salario: { emoji: "💼", color: "#3DDC97", label: "Salario" },
  Educación: { emoji: "📚", color: "#A78BFA", label: "Educación" },
  Traslado: { emoji: "🔁", color: "#5B8DEF", label: "Traslado" },
};

export function metaCategoria(nombre: string) {
  return (
    CATEGORY_META[nombre] ?? {
      emoji: "💳",
      color: "#8B93A7",
      label: nombre,
    }
  );
}
