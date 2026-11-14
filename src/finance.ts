import type { AppState, Movimiento, Presupuesto } from "./types";

export function claveMes(date: Date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function presupuestoMes(state: AppState, mes: Date = new Date()) {
  const mesClave = claveMes(mes);
  const gastado = new Map<string, number>();

  for (const movimiento of movimientosDelMes(state.movimientos, mes)) {
    if (movimiento.tipo !== "gasto") continue;
    gastado.set(movimiento.categoria, (gastado.get(movimiento.categoria) ?? 0) + movimiento.monto);
  }

  const presupuestos = (state.presupuestos ?? []).filter((presupuesto) => presupuesto.mes === mesClave);
  const limites = new Map<string, number>();
  for (const presupuesto of presupuestos) {
    limites.set(
      presupuesto.categoria,
      (limites.get(presupuesto.categoria) ?? 0) + presupuesto.monto
    );
  }
  const categorias = Array.from(new Set([...limites.keys(), ...gastado.keys()]));

  const porCategoria = categorias.map((categoria) => {
    const limite = limites.get(categoria) ?? 0;
    const usado = gastado.get(categoria) ?? 0;
    return {
      categoria,
      limite,
      usado,
      restante: limite - usado,
      pct: limite > 0 ? Math.min(1, usado / limite) : 0,
    };
  }).sort((a, b) => b.usado - a.usado);

  const totalPresupuesto = presupuestos.reduce((sum, item) => sum + item.monto, 0);
  const totalGastado = [...gastado.values()].reduce((sum, value) => sum + value, 0);

  return {
    totalPresupuesto,
    totalGastado,
    restante: totalPresupuesto - totalGastado,
    porCategoria,
  };
}

export function gastosPorDetalleOtros(movimientos: Movimiento[]) {
  const totales = new Map<string, number>();
  for (const movimiento of movimientos) {
    if (
      movimiento.tipo !== "gasto" ||
      movimiento.categoria !== "Otros" ||
      !movimiento.detalleCategoria?.trim()
    ) {
      continue;
    }
    const detalle = movimiento.detalleCategoria.trim();
    totales.set(detalle, (totales.get(detalle) ?? 0) + movimiento.monto);
  }
  return Array.from(totales, ([nombre, total]) => ({ nombre, total })).sort(
    (a, b) => b.total - a.total
  );
}

export function parsearSaldoInicial(value: string) {
  const normalized = value.trim().replace(/^\$\s*/, "");
  if (!/^-?(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/.test(normalized)) return null;

  const negative = normalized.startsWith("-");
  const digits = normalized.replace(/\D/g, "");
  const amount = Number(digits) * (negative ? -1 : 1);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function parsearMonto(value: string) {
  const amount = parsearSaldoInicial(value);
  return amount !== null && amount > 0 ? amount : null;
}

export function formatearMontoEntrada(value: string, allowNegative = false) {
  const negative = allowNegative && value.trimStart().startsWith("-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return negative ? "-" : "";

  const amount = Number(digits);
  if (!Number.isSafeInteger(amount)) return value;
  const formatted = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(amount);
  return negative ? `-${formatted}` : formatted;
}

export function movimientosDelMes(
  movimientos: Movimiento[],
  mes: Date = new Date()
) {
  return movimientos.filter((movimiento) => {
    const fecha = new Date(movimiento.fecha);
    return (
      !Number.isNaN(fecha.getTime()) &&
      fecha.getFullYear() === mes.getFullYear() &&
      fecha.getMonth() === mes.getMonth()
    );
  });
}

export function resumenMes(state: AppState, mes: Date = new Date()) {
  const mesClave = claveMes(mes);
  const movimientos = movimientosDelMes(state.movimientos, mes);
  const movimientosAnteriores = state.movimientos.filter((movimiento) => {
    const fecha = new Date(movimiento.fecha);
    if (Number.isNaN(fecha.getTime())) return false;
    const claveMovimiento = claveMes(fecha);
    return (
      claveMovimiento >= state.mesSaldoInicial &&
      claveMovimiento < mesClave
    );
  });
  const saldoAnterior = movimientosAnteriores.reduce(
    (saldo, movimiento) =>
      saldo +
      (movimiento.tipo === "ingreso"
        ? movimiento.monto
        : movimiento.tipo === "gasto"
          ? -movimiento.monto
          : 0),
    state.saldoInicial
  );
  const ingresos = movimientos
    .filter((movimiento) => movimiento.tipo === "ingreso")
    .reduce((total, movimiento) => total + movimiento.monto, 0);
  const gastos = movimientos
    .filter((movimiento) => movimiento.tipo === "gasto")
    .reduce((total, movimiento) => total + movimiento.monto, 0);
  const saldoFinal = saldoAnterior + ingresos - gastos;
  const tasaAhorro = ingresos > 0 ? (ingresos - gastos) / ingresos : 0;

  return {
    ingresos,
    gastos,
    saldoInicialMes: saldoAnterior,
    saldoFinal,
    tasaAhorro,
  };
}

export function eliminarMovimiento(
  state: AppState,
  id: string
): AppState {
  if (!state.movimientos.some((movimiento) => movimiento.id === id)) return state;

  return {
    ...state,
    movimientos: state.movimientos.filter((movimiento) => movimiento.id !== id),
  };
}

export function movimientoEsMontoValido(movimiento: Movimiento) {
  return Number.isSafeInteger(movimiento.monto) && movimiento.monto > 0;
}
