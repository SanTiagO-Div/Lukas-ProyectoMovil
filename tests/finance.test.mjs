import assert from "node:assert/strict";
import test from "node:test";
import {
  movimientosDelMes,
  eliminarMovimiento,
  gastosPorDetalleOtros,
  formatearMontoEntrada,
  parsearMonto,
  parsearSaldoInicial,
  presupuestoMes,
  resumenMes,
} from "../src/finance.ts";
import { validateRegistration } from "../src/registration.ts";
import { isAppState, normalizeAppState } from "../src/stateValidation.ts";
import { crearMensajeCobro } from "../src/debts.ts";
import { money } from "../src/theme.ts";

const validRegistration = {
  nombre: "Ana",
  apellidos: "Pérez",
  fechaNacimiento: "1990-10-12",
  email: "ana@example.com",
  password: "clave-segura",
};

test("valida y normaliza estados financieros persistidos", () => {
  const savedState = {
    cuenta: "Cuenta principal",
    saldoInicial: 0,
    movimientos: [],
    cuotas: [],
    metas: [],
  };
  const normalizedState = normalizeAppState(savedState);

  assert.equal(isAppState(savedState), true);
  assert.match(normalizedState.mesSaldoInicial, /^\d{4}-(0[1-9]|1[0-2])$/);
  assert.deepEqual(normalizedState, {
    ...savedState,
    mesSaldoInicial: normalizedState.mesSaldoInicial,
    presupuestos: [],
  });
  assert.equal(isAppState({ ...savedState, saldoInicial: Number.NaN }), false);
  assert.equal(isAppState({ ...savedState, mesSaldoInicial: "2026-13" }), false);
});

test("usa un único formato para los mensajes de cobro", () => {
  assert.equal(
    crearMensajeCobro("Ana", 125000),
    `Hola Ana, te escribo desde Lukas para cobrar ${money(125000)}. ¿Me confirmas el pago?`
  );
});

test("valida el registro y calcula la edad exacta antes y después del cumpleaños", () => {
  assert.equal(
    validateRegistration(validRegistration, [], new Date("2026-10-11T12:00:00.000Z")),
    null
  );
  assert.equal(
    validateRegistration(
      { ...validRegistration, fechaNacimiento: "2008-10-12" },
      [],
      new Date("2026-10-11T12:00:00.000Z")
    ),
    "Debes ser mayor de 18 años para usar la app."
  );
  assert.equal(
    validateRegistration(
      { ...validRegistration, fechaNacimiento: "2008-10-12" },
      [],
      new Date("2026-10-12T00:00:00.000Z")
    ),
    null
  );
});

test("rechaza fechas imposibles, datos incompletos, correo inválido y contraseña corta", () => {
  assert.equal(
    validateRegistration({ ...validRegistration, fechaNacimiento: "2000-02-30" }, []),
    "La fecha de nacimiento no es válida."
  );
  assert.equal(
    validateRegistration({ ...validRegistration, nombre: " " }, []),
    "Completa todos los campos obligatorios."
  );
  assert.equal(
    validateRegistration({ ...validRegistration, email: "correo-invalido" }, []),
    "Ingresa un correo electrónico válido."
  );
  assert.equal(
    validateRegistration({ ...validRegistration, password: "12345" }, []),
    "La contraseña debe tener al menos 6 caracteres."
  );
});

test("rechaza correos ya registrados sin distinguir mayúsculas", () => {
  assert.equal(
    validateRegistration(validRegistration, ["ANA@EXAMPLE.COM"]),
    "Este correo ya está registrado."
  );
});

test("parsea montos enteros en formato colombiano y separadores de miles", () => {
  assert.equal(parsearMonto("1250000"), 1250000);
  assert.equal(parsearMonto("$ 1.250.000"), 1250000);
  assert.equal(parsearMonto("1,250,000"), 1250000);
});

test("rechaza montos negativos, decimales, mal agrupados y fuera de rango", () => {
  assert.equal(parsearMonto("-1000"), null);
  assert.equal(parsearMonto("1.25"), null);
  assert.equal(parsearMonto("12.50"), null);
  assert.equal(parsearMonto("9007199254740992"), null);
  assert.equal(parsearMonto("texto"), null);
});

test("formatea montos de entrada con separadores de miles y admite saldo negativo", () => {
  assert.equal(formatearMontoEntrada("2000"), "2.000");
  assert.equal(formatearMontoEntrada("1250000"), "1.250.000");
  assert.equal(formatearMontoEntrada("1250000", true), "1.250.000");
  assert.equal(formatearMontoEntrada("-1250000", true), "-1.250.000");
  assert.equal(formatearMontoEntrada("-1250000"), "1.250.000");
});

test("acepta un saldo inicial negativo y cero", () => {
  assert.equal(parsearSaldoInicial("-1.250.000"), -1250000);
  assert.equal(parsearSaldoInicial("0"), 0);
  assert.equal(parsearSaldoInicial(""), null);
});

test("resume únicamente ingresos y gastos del mes, nunca traslados", () => {
  const estado = {
    cuenta: "Nequi",
    saldoInicial: 100000,
    mesSaldoInicial: "2026-10",
    movimientos: [
      { id: "in", tipo: "ingreso", monto: 50000, categoria: "Salario", nota: "", fecha: "2026-10-05T12:00:00.000Z", cuenta: "A" },
      { id: "out", tipo: "gasto", monto: 20000, categoria: "Mercado", nota: "", fecha: "2026-10-06T12:00:00.000Z", cuenta: "A" },
      { id: "move", tipo: "traslado", monto: 30000, categoria: "Traslado", nota: "", fecha: "2026-10-07T12:00:00.000Z", cuenta: "A" },
      { id: "old", tipo: "ingreso", monto: 90000, categoria: "Salario", nota: "", fecha: "2026-09-30T12:00:00.000Z", cuenta: "A" },
      { id: "invalid", tipo: "gasto", monto: 90000, categoria: "Mercado", nota: "", fecha: "invalid", cuenta: "A" },
    ],
    cuotas: [],
    metas: [],
  };
  const october = new Date("2026-10-15T12:00:00.000Z");

  assert.deepEqual(movimientosDelMes(estado.movimientos, october).map(({ id }) => id), ["in", "out", "move"]);
  assert.deepEqual(resumenMes(estado, october), {
    ingresos: 50000,
    gastos: 20000,
    saldoInicialMes: 100000,
    saldoFinal: 130000,
    tasaAhorro: 0.6,
  });
});

test("eliminar un movimiento actualiza solo la lista de movimientos", () => {
  const estado = {
    cuenta: "Nequi",
    saldoInicial: 100000,
    mesSaldoInicial: "2026-10",
    movimientos: [
      { id: "expense", tipo: "gasto", monto: 20000, categoria: "Mercado", nota: "", fecha: "2026-10-06T12:00:00.000Z", cuenta: "Nequi" },
      { id: "income", tipo: "ingreso", monto: 50000, categoria: "Salario", nota: "", fecha: "2026-10-05T12:00:00.000Z", cuenta: "Bancolombia" },
    ],
    cuotas: [],
    metas: [],
  };
  const updated = eliminarMovimiento(estado, "expense");

  assert.deepEqual(updated.movimientos.map(({ id }) => id), ["income"]);
  assert.equal(updated.saldoInicial, estado.saldoInicial);
  assert.equal(updated.cuotas, estado.cuotas);
  assert.equal(updated.metas, estado.metas);
  assert.deepEqual(resumenMes(updated, new Date("2026-10-15T12:00:00.000Z")), {
    ingresos: 50000,
    gastos: 0,
    saldoInicialMes: 100000,
    saldoFinal: 150000,
    tasaAhorro: 1,
  });
});

test("eliminar un id que no existe conserva el estado original", () => {
  const estado = {
    cuenta: "Nequi",
    saldoInicial: 0,
    mesSaldoInicial: "2026-10",
    movimientos: [],
    cuotas: [],
    metas: [],
  };

  assert.equal(eliminarMovimiento(estado, "ausente"), estado);
});

test("arrastra ingresos y gastos anteriores al saldo inicial del mes", () => {
  const estado = {
    cuenta: "Nequi",
    saldoInicial: 100000,
    mesSaldoInicial: "2026-09",
    movimientos: [
      { id: "september-income", tipo: "ingreso", monto: 50000, categoria: "Salario", nota: "", fecha: "2026-09-05T12:00:00.000Z", cuenta: "A" },
      { id: "september-expense", tipo: "gasto", monto: 10000, categoria: "Mercado", nota: "", fecha: "2026-09-06T12:00:00.000Z", cuenta: "A" },
      { id: "september-transfer", tipo: "traslado", monto: 40000, categoria: "Traslado", nota: "", fecha: "2026-09-07T12:00:00.000Z", cuenta: "A" },
      { id: "october-expense", tipo: "gasto", monto: 25000, categoria: "Arriendo", nota: "", fecha: "2026-10-02T12:00:00.000Z", cuenta: "A" },
    ],
    cuotas: [],
    metas: [],
  };

  assert.deepEqual(resumenMes(estado, new Date("2026-10-15T12:00:00.000Z")), {
    ingresos: 0,
    gastos: 25000,
    saldoInicialMes: 140000,
    saldoFinal: 115000,
    tasaAhorro: 0,
  });
});

test("no incorpora movimientos anteriores al mes de saldo base", () => {
  const estado = {
    cuenta: "Nequi",
    saldoInicial: 100000,
    mesSaldoInicial: "2026-10",
    movimientos: [
      { id: "old", tipo: "ingreso", monto: 200000, categoria: "Salario", nota: "", fecha: "2026-09-30T12:00:00.000Z", cuenta: "A" },
      { id: "current", tipo: "gasto", monto: 10000, categoria: "Mercado", nota: "", fecha: "2026-10-02T12:00:00.000Z", cuenta: "A" },
    ],
    cuotas: [],
    metas: [],
  };

  assert.deepEqual(resumenMes(estado, new Date("2026-10-15T12:00:00.000Z")), {
    ingresos: 0,
    gastos: 10000,
    saldoInicialMes: 100000,
    saldoFinal: 90000,
    tasaAhorro: 0,
  });
});

test("calcula el presupuesto mensual y el restante por categoría", () => {
  const estado = {
    cuenta: "Nequi",
    saldoInicial: 100000,
    mesSaldoInicial: "2026-10",
    movimientos: [
      { id: "m1", tipo: "gasto", monto: 30000, categoria: "Mercado", nota: "", fecha: "2026-10-02T12:00:00.000Z", cuenta: "A" },
      { id: "m2", tipo: "gasto", monto: 15000, categoria: "Mercado", nota: "", fecha: "2026-10-03T12:00:00.000Z", cuenta: "A" },
      { id: "m3", tipo: "gasto", monto: 25000, categoria: "Arriendo", nota: "", fecha: "2026-10-05T12:00:00.000Z", cuenta: "A" },
      { id: "m4", tipo: "ingreso", monto: 50000, categoria: "Salario", nota: "", fecha: "2026-10-07T12:00:00.000Z", cuenta: "A" },
    ],
    cuotas: [],
    metas: [],
    presupuestos: [
      { id: "p1", categoria: "Mercado", monto: 50000, mes: "2026-10" },
      { id: "p2", categoria: "Arriendo", monto: 30000, mes: "2026-10" },
    ],
  };

  assert.deepEqual(presupuestoMes(estado, new Date("2026-10-15T12:00:00.000Z")), {
    totalPresupuesto: 80000,
    totalGastado: 70000,
    restante: 10000,
    porCategoria: [
      { categoria: "Mercado", limite: 50000, usado: 45000, restante: 5000, pct: 0.9 },
      { categoria: "Arriendo", limite: 30000, usado: 25000, restante: 5000, pct: 0.8333333333333334 },
    ],
  });
});

test("agrupa gastos de Otros por nombre personalizado y conserva subtotales", () => {
  const movimientos = [
    { tipo: "gasto", monto: 12000, categoria: "Otros", detalleCategoria: "Mascota" },
    { tipo: "gasto", monto: 8000, categoria: "Otros", detalleCategoria: "Mascota" },
    { tipo: "gasto", monto: 5000, categoria: "Otros", detalleCategoria: "Regalo" },
    { tipo: "gasto", monto: 9000, categoria: "Mercado", detalleCategoria: "No incluir" },
    { tipo: "ingreso", monto: 7000, categoria: "Otros", detalleCategoria: "No incluir" },
  ];

  assert.deepEqual(gastosPorDetalleOtros(movimientos), [
    { nombre: "Mascota", total: 20000 },
    { nombre: "Regalo", total: 5000 },
  ]);
});

test("suma varios límites personalizados de Otros en el presupuesto de esa categoría", () => {
  const estado = {
    cuenta: "Nequi",
    saldoInicial: 0,
    mesSaldoInicial: "2026-10",
    movimientos: [
      { id: "m1", tipo: "gasto", monto: 12000, categoria: "Otros", detalleCategoria: "Mascota", nota: "", fecha: "2026-10-02T12:00:00.000Z", cuenta: "A" },
      { id: "m2", tipo: "gasto", monto: 5000, categoria: "Otros", detalleCategoria: "Regalo", nota: "", fecha: "2026-10-03T12:00:00.000Z", cuenta: "A" },
    ],
    cuotas: [],
    metas: [],
    presupuestos: [
      { id: "p1", categoria: "Otros", detalleCategoria: "Mascota", monto: 20000, mes: "2026-10" },
      { id: "p2", categoria: "Otros", detalleCategoria: "Regalo", monto: 10000, mes: "2026-10" },
    ],
  };

  assert.deepEqual(
    presupuestoMes(estado, new Date("2026-10-15T12:00:00.000Z")).porCategoria.find(
      ({ categoria }) => categoria === "Otros"
    ),
    { categoria: "Otros", limite: 30000, usado: 17000, restante: 13000, pct: 17 / 30 }
  );
});
