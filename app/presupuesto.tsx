import {
  claveMes,
  parsearSaldoInicial,
  presupuestoMes,
} from "../src/finance";
import { movimientosDelMes, resumenMes, useLukas } from "../src/store";
import { ResponsivePage } from "../src/ResponsivePage";
import {
  colors,
  formatearMontoEntrada,
  getCategoryOptions,
  money,
  parsearMonto,
} from "../src/theme";
import { AmountInput, AppHeader } from "../src/ui";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";

export default function Presupuesto() {
  const state = useLukas();
  const mesActual = useMemo(() => new Date(), []);
  const mesKey = claveMes(mesActual);
  const r = resumenMes(state, mesActual);
  const gastosDelMes = movimientosDelMes(state.movimientos, mesActual).filter(
    (movimiento) => movimiento.tipo === "gasto"
  );
  const presupuestoActual = presupuestoMes(state, mesActual);
  const gastosPresupuestados = (state.presupuestos ?? []).filter((item) => item.mes === mesKey);
  const [saldoInicial, setSaldoInicial] = useState("");
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [categoriaPresupuesto, setCategoriaPresupuesto] = useState(
    getCategoryOptions("gasto")[0]
  );
  const [detalleCategoriaPresupuesto, setDetalleCategoriaPresupuesto] = useState("");
  const [montoPresupuesto, setMontoPresupuesto] = useState("");

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader title="Presupuesto" showBack />
      <Text style={styles.p}>
        Revisa tus límites y organiza tus gastos del mes.
      </Text>
      <View style={styles.card}>
        <Row k="Saldo inicial del mes" v={money(r.saldoInicialMes)} />
        <Row k="Ingresos" v={money(r.ingresos)} />
        <Row k="Gastos" v={money(r.gastos)} />
        <Row k="Resultado del mes" v={money(r.ingresos - r.gastos)} />
        <Row k="Saldo final estimado" v={money(r.saldoFinal)} />
        <Row k="Tasa de ahorro" v={`${Math.round(r.tasaAhorro * 100)}%`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.metaTitle}>Saldo inicial</Text>
        <Text style={styles.k}>
          Base configurada para el mes: {money(state.saldoInicial)}.
        </Text>
        {!editandoSaldo ? (
          <Pressable
            accessibilityRole="button"
            style={styles.btn}
            onPress={() => {
              setSaldoInicial(formatearMontoEntrada(String(state.saldoInicial)));
              setEditandoSaldo(true);
            }}
          >
            <Text style={styles.btnTxt}>Editar saldo inicial</Text>
          </Pressable>
        ) : (
          <>
            <AmountInput
              accessibilityLabel="Saldo inicial"
              placeholder="Ej. 1.250.000"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={saldoInicial}
              allowNegative
              onChangeText={setSaldoInicial}
              style={styles.input}
            />
            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setSaldoInicial("");
                  setEditandoSaldo(false);
                }}
              >
                <Text style={styles.cancelBtnTxt}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.btn}
                onPress={() => {
                  const amount = parsearSaldoInicial(saldoInicial);
                  if (amount === null) {
                    Alert.alert(
                      "Saldo inválido",
                      "Ingresa el saldo entero que tenías al inicio de este mes; puedes usar puntos o comas para separar miles."
                    );
                    return;
                  }
                  state.establecerSaldoInicial(amount);
                  setSaldoInicial("");
                  setEditandoSaldo(false);
                }}
              >
                <Text style={styles.btnTxt}>Guardar cambios</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.metaTitle}>Presupuesto por categoría</Text>
        <View style={styles.rowWrap}>
          {getCategoryOptions("gasto").map((categoria) => (
            <Pressable
              key={categoria}
              onPress={() => {
                setCategoriaPresupuesto(categoria);
                if (categoria !== "Otros") setDetalleCategoriaPresupuesto("");
              }}
              style={[styles.chip, categoria === categoriaPresupuesto && styles.chipOn]}
            >
              <Text style={[styles.chipTxt, categoria === categoriaPresupuesto && styles.chipTxtOn]}>
                {categoria}
              </Text>
            </Pressable>
          ))}
        </View>
        {categoriaPresupuesto === "Otros" && (
          <TextInput
            accessibilityLabel="Nombre del presupuesto dentro de Otros"
            placeholder="¿Qué tipo de gasto? Ej. Mascota"
            placeholderTextColor={colors.muted}
            value={detalleCategoriaPresupuesto}
            onChangeText={setDetalleCategoriaPresupuesto}
            style={styles.input}
          />
        )}
        <AmountInput
          accessibilityLabel="Monto del presupuesto"
          placeholder="Monto mensual límite"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={montoPresupuesto}
          onChangeText={setMontoPresupuesto}
          style={styles.input}
        />
        <View style={styles.inlineActions}>
          <Pressable
            style={styles.btn}
            onPress={() => {
              const monto = parsearMonto(montoPresupuesto);
              const detalleCategoria = detalleCategoriaPresupuesto.trim();
              if (monto === null) {
                Alert.alert("Monto inválido", "Ingresa un presupuesto mayor que cero.");
                return;
              }
              if (categoriaPresupuesto === "Otros" && !detalleCategoria) {
                Alert.alert("Detalle requerido", "Escribe el nombre para este presupuesto de Otros.");
                return;
              }
              state.guardarPresupuesto({
                categoria: categoriaPresupuesto,
                ...(categoriaPresupuesto === "Otros" ? { detalleCategoria } : {}),
                monto,
                mes: mesKey,
              });
              setMontoPresupuesto("");
              setDetalleCategoriaPresupuesto("");
            }}
          >
            <Text style={styles.btnTxt}>Guardar presupuesto</Text>
          </Pressable>
        </View>
        {gastosPresupuestados.length > 0 && (
          <View style={styles.presupuestoList}>
            {gastosPresupuestados.map((item) => {
              const detalle = presupuestoActual.porCategoria.find((entry) => entry.categoria === item.categoria);
              const usado = item.detalleCategoria
                ? gastosDelMes
                    .filter(
                      (movimiento) =>
                        movimiento.categoria === item.categoria &&
                        movimiento.detalleCategoria?.trim() === item.detalleCategoria
                    )
                    .reduce((total, movimiento) => total + movimiento.monto, 0)
                : detalle?.usado ?? 0;
              const disponible = item.monto - usado;
              const progreso = Math.min(1, usado / item.monto);
              return (
                <View key={item.id} style={styles.budgetRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.budgetTitle}>
                      {item.detalleCategoria
                        ? `${item.categoria} · ${item.detalleCategoria}`
                        : item.categoria}
                    </Text>
                    <Text style={styles.budgetMeta}>
                      Usado: {money(usado)} de {money(item.monto)}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progreso * 100}%`,
                            backgroundColor: disponible < 0 ? colors.danger : colors.yellow,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.budgetMeta,
                        disponible < 0 && styles.overBudget,
                      ]}
                    >
                      {disponible >= 0
                        ? `Disponible: ${money(disponible)}`
                        : `Excedido por: ${money(Math.abs(disponible))}`}
                    </Text>
                    <Link
                      href={{
                        pathname: "/explore",
                        params: {
                          tipo: "gasto",
                          categoria: item.categoria,
                          ...(item.detalleCategoria
                            ? { detalleCategoria: item.detalleCategoria }
                            : {}),
                        },
                      }}
                      asChild
                    >
                      <Pressable accessibilityRole="button" style={styles.recordExpense}>
                        <Text style={styles.recordExpenseText}>Registrar gasto de esta categoría</Text>
                      </Pressable>
                    </Link>
                  </View>
                  <Pressable onPress={() => state.borrarPresupuesto(item.id)}>
                    <Text style={styles.deleteText}>Quitar</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.budgetSummary}>
          <Text style={styles.k}>Presupuesto total</Text>
          <Text style={styles.v}>{money(presupuestoActual.totalPresupuesto)}</Text>
        </View>
        <View style={styles.budgetSummary}>
          <Text style={styles.k}>Gastado</Text>
          <Text style={[styles.v, { color: colors.danger }]}>{money(presupuestoActual.totalGastado)}</Text>
        </View>
        <View style={styles.budgetSummary}>
          <Text style={styles.k}>Restante</Text>
          <Text style={[styles.v, { color: presupuestoActual.restante >= 0 ? colors.mint : colors.danger }]}>
            {money(presupuestoActual.restante)}
          </Text>
        </View>
      </View>

      <View style={styles.quickLinks}>
        <Link href="/metas" asChild>
          <Pressable accessibilityRole="button" style={styles.quickLink}>
            <View style={styles.quickLinkCopy}>
              <Text style={styles.quickLinkTitle}>Metas de ahorro</Text>
              <Text style={styles.quickLinkSubtitle}>Crea metas y registra tus aportes</Text>
            </View>
            <Text style={styles.quickLinkArrow}>›</Text>
          </Pressable>
        </Link>
        <Link href="/gastos-categoria" asChild>
          <Pressable accessibilityRole="button" style={styles.quickLink}>
            <View style={styles.quickLinkCopy}>
              <Text style={styles.quickLinkTitle}>Gastos por categoría</Text>
              <Text style={styles.quickLinkSubtitle}>Consulta el detalle de este mes</Text>
            </View>
            <Text style={styles.quickLinkArrow}>›</Text>
          </Pressable>
        </Link>
      </View>
      <Text style={styles.note}>
        Traslado entre tus cuentas (cajero o pasar plata a Nequi) no cuenta como
        gasto.
      </Text>
    </ResponsivePage>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  p: { color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  k: { color: colors.muted, flex: 1 },
  v: { fontWeight: "700", color: colors.ink },
  h: { fontWeight: "800", fontSize: 18, color: colors.ink },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  quickLinks: { gap: 10 },
  quickLink: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  quickLinkCopy: { flex: 1, gap: 4 },
  quickLinkTitle: { color: colors.ink, fontWeight: "700" },
  quickLinkSubtitle: { color: colors.muted, fontSize: 12 },
  quickLinkArrow: { color: colors.yellow, fontSize: 24, fontWeight: "700" },
  metaTitle: { fontWeight: "700", fontSize: 16, color: colors.ink },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  chipTxt: { color: colors.ink, fontWeight: "600", fontSize: 12 },
  chipTxtOn: { color: colors.yellowInk },
  inlineActions: { marginTop: 4 },
  formActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  cancelBtn: { padding: 14, minHeight: 48, justifyContent: "center" },
  cancelBtnTxt: { color: colors.muted, fontWeight: "700" },
  presupuestoList: { gap: 10, marginTop: 4 },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  budgetTitle: { color: colors.ink, fontWeight: "700" },
  budgetMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  recordExpense: { alignSelf: "flex-start", paddingVertical: 6 },
  recordExpenseText: { color: colors.blue, fontWeight: "700", fontSize: 12 },
  progressTrack: {
    height: 6,
    backgroundColor: colors.soft,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 6,
  },
  progressFill: { height: "100%", borderRadius: 8 },
  overBudget: { color: colors.danger },
  deleteText: { color: colors.danger, fontWeight: "700" },
  budgetSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.yellow,
    padding: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: colors.yellowInk, fontWeight: "700" },
});
