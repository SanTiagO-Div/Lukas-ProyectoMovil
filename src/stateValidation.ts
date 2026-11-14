import type { AppState } from "./types";
import { claveMes, movimientoEsMontoValido } from "./finance.ts";

export type StoredAppState = Omit<AppState, "mesSaldoInicial"> & {
  mesSaldoInicial?: string;
};

export function isAppState(value: unknown): value is StoredAppState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AppState>;
  return (
    typeof candidate.cuenta === "string" &&
    typeof candidate.saldoInicial === "number" &&
    Number.isFinite(candidate.saldoInicial) &&
    (candidate.mesSaldoInicial === undefined ||
      (typeof candidate.mesSaldoInicial === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(candidate.mesSaldoInicial))) &&
    Array.isArray(candidate.movimientos) &&
    candidate.movimientos.every(
      (movimiento) =>
        movimiento &&
        typeof movimiento.id === "string" &&
        movimiento.id.length > 0 &&
        ["gasto", "ingreso", "traslado"].includes(movimiento.tipo) &&
        movimientoEsMontoValido(movimiento) &&
        typeof movimiento.categoria === "string" &&
        movimiento.categoria.trim().length > 0 &&
        (movimiento.detalleCategoria === undefined ||
          (typeof movimiento.detalleCategoria === "string" &&
            movimiento.detalleCategoria.trim().length > 0)) &&
        typeof movimiento.nota === "string" &&
        typeof movimiento.fecha === "string" &&
        !Number.isNaN(Date.parse(movimiento.fecha)) &&
        typeof movimiento.cuenta === "string" &&
        movimiento.cuenta.trim().length > 0
    ) &&
    Array.isArray(candidate.cuotas) &&
    candidate.cuotas.every(
      (cuota) =>
        cuota &&
        typeof cuota.id === "string" &&
        cuota.id.length > 0 &&
        typeof cuota.nombre === "string" &&
        cuota.nombre.trim().length > 0 &&
        Number.isSafeInteger(cuota.monto) &&
        cuota.monto > 0 &&
        typeof cuota.pagada === "boolean" &&
        ["pagar", "cobrar"].includes(cuota.tipo) &&
        (cuota.persona === undefined || typeof cuota.persona === "string")
    ) &&
    Array.isArray(candidate.metas) &&
    candidate.metas.every(
      (meta) =>
        meta &&
        typeof meta.id === "string" &&
        meta.id.length > 0 &&
        typeof meta.nombre === "string" &&
        meta.nombre.trim().length > 0 &&
        typeof meta.emoji === "string" &&
        Number.isSafeInteger(meta.objetivo) &&
        meta.objetivo > 0 &&
        Number.isSafeInteger(meta.aportado) &&
        meta.aportado >= 0 &&
        typeof meta.fechaMeta === "string" &&
        !Number.isNaN(Date.parse(meta.fechaMeta))
    ) &&
    (candidate.presupuestos === undefined ||
      (Array.isArray(candidate.presupuestos) &&
        candidate.presupuestos.every(
          (presupuesto) =>
            presupuesto &&
            typeof presupuesto.id === "string" &&
            presupuesto.id.length > 0 &&
            typeof presupuesto.categoria === "string" &&
            presupuesto.categoria.trim().length > 0 &&
            (presupuesto.detalleCategoria === undefined ||
              (typeof presupuesto.detalleCategoria === "string" &&
                presupuesto.detalleCategoria.trim().length > 0)) &&
            Number.isSafeInteger(presupuesto.monto) &&
            presupuesto.monto > 0 &&
            typeof presupuesto.mes === "string" &&
            /^\d{4}-(0[1-9]|1[0-2])$/.test(presupuesto.mes)
        )))
  );
}

export function normalizeAppState(value: StoredAppState): AppState {
  return {
    ...value,
    mesSaldoInicial: value.mesSaldoInicial ?? claveMes(),
    presupuestos: value.presupuestos ?? [],
  };
}
