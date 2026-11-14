import { movimientosDelMes, resumenMes } from "./finance";
import { metaCategoria } from "./theme";
import type { AppState, Movimiento } from "./types";

export type RangoSerie = "7D" | "1M" | "3M" | "6M" | "1Y";

export function mesAnterior(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function deltaVsMesAnterior(state: AppState, date = new Date()) {
  const actual = resumenMes(state, date);
  const previo = resumenMes(state, mesAnterior(date));
  return {
    gastos: actual.gastos - previo.gastos,
    ingresos: actual.ingresos - previo.ingresos,
    saldo: actual.saldoFinal - previo.saldoFinal,
    previo,
    actual,
  };
}

export function gastosPorCategoria(state: AppState, date = new Date()) {
  const gastos = movimientosDelMes(state.movimientos, date).filter(
    (m) => m.tipo === "gasto"
  );
  const total = gastos.reduce((sum, m) => sum + m.monto, 0);
  const map = new Map<string, { monto: number; count: number }>();
  for (const movimiento of gastos) {
    const current = map.get(movimiento.categoria) ?? { monto: 0, count: 0 };
    current.monto += movimiento.monto;
    current.count += 1;
    map.set(movimiento.categoria, current);
  }
  return Array.from(map.entries())
    .map(([categoria, info]) => {
      const meta = metaCategoria(categoria);
      return {
        categoria,
        label: meta.label,
        emoji: meta.emoji,
        color: meta.color,
        monto: info.monto,
        count: info.count,
        pct: total > 0 ? info.monto / total : 0,
      };
    })
    .sort((a, b) => b.monto - a.monto);
}

export function cuentasResumen(state: AppState) {
  const byAccount = new Map<
    string,
    { saldo: number; last?: string; count: number }
  >();
  const names = new Set<string>();
  if (state.cuenta.trim()) names.add(state.cuenta.trim());
  for (const movimiento of state.movimientos) {
    if (movimiento.cuenta.trim()) names.add(movimiento.cuenta.trim());
  }
  if (names.size === 0) names.add("Cuenta principal");

  for (const name of names) {
    byAccount.set(name, { saldo: 0, count: 0 });
  }

  const share = names.size > 0 ? state.saldoInicial / names.size : 0;
  for (const name of names) {
    const row = byAccount.get(name);
    if (row) row.saldo += share;
  }

  const sorted = [...state.movimientos].sort(
    (a, b) => Date.parse(a.fecha) - Date.parse(b.fecha)
  );
  for (const movimiento of sorted) {
    const name = movimiento.cuenta.trim() || "Cuenta principal";
    const row = byAccount.get(name) ?? { saldo: 0, count: 0 };
    if (movimiento.tipo === "ingreso") row.saldo += movimiento.monto;
    if (movimiento.tipo === "gasto") row.saldo -= movimiento.monto;
    row.count += 1;
    row.last = movimiento.fecha;
    byAccount.set(name, row);
  }

  return Array.from(byAccount.entries()).map(([nombre, info]) => ({
    nombre,
    saldo: Math.round(info.saldo),
    last: info.last,
    count: info.count,
  }));
}

export function movimientosRecientes(movimientos: Movimiento[], limit = 8) {
  return [...movimientos]
    .filter((m) => !Number.isNaN(Date.parse(m.fecha)))
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, limit);
}

function inicioRango(rango: RangoSerie, now = new Date()) {
  const date = new Date(now);
  if (rango === "7D") date.setDate(date.getDate() - 6);
  else if (rango === "1M") date.setMonth(date.getMonth() - 1);
  else if (rango === "3M") date.setMonth(date.getMonth() - 2);
  else if (rango === "6M") date.setMonth(date.getMonth() - 5);
  else date.setFullYear(date.getFullYear() - 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function serieIngresoGasto(
  movimientos: Movimiento[],
  rango: RangoSerie,
  now = new Date()
) {
  const start = inicioRango(rango, now);
  const monthly = rango !== "7D";
  const buckets = new Map<string, { label: string; ingresos: number; gastos: number; order: number }>();

  if (monthly) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    let order = 0;
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      const label = cursor.toLocaleDateString(
        "es-CO",
        rango === "1Y" ? { month: "short", year: "2-digit" } : { month: "short" }
      );
      buckets.set(key, {
        label: label.replace(".", "").replace(" de ", " "),
        ingresos: 0,
        gastos: 0,
        order,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      order += 1;
    }
  } else {
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      buckets.set(key, {
        label: String(day.getDate()),
        ingresos: 0,
        gastos: 0,
        order: i,
      });
    }
  }

  for (const movimiento of movimientos) {
    const fecha = new Date(movimiento.fecha);
    if (Number.isNaN(fecha.getTime()) || fecha < start || fecha > now) continue;
    const key = monthly
      ? `${fecha.getFullYear()}-${fecha.getMonth()}`
      : fecha.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (movimiento.tipo === "ingreso") bucket.ingresos += movimiento.monto;
    if (movimiento.tipo === "gasto") bucket.gastos += movimiento.monto;
  }

  return Array.from(buckets.values()).sort((a, b) => a.order - b.order);
}

export function promedioGastosMensual(state: AppState, meses = 6, now = new Date()) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < meses; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const r = resumenMes(state, date);
    if (r.gastos > 0 || r.ingresos > 0) {
      total += r.gastos;
      count += 1;
    }
  }
  return count > 0 ? Math.round(total / count) : 0;
}

export function picoIngreso(state: AppState, now = new Date()) {
  let best = { monto: 0, fecha: now };
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const r = resumenMes(state, date);
    if (r.ingresos > best.monto) best = { monto: r.ingresos, fecha: date };
  }
  return best;
}
