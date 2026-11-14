import { resumenMes, useLukas } from "../src/store";
import { ResponsivePage } from "../src/ResponsivePage";
import {
  cuentasResumen,
  deltaVsMesAnterior,
  movimientosRecientes,
} from "../src/stats";
import {
  colors,
  formatearMontoEntrada,
  metaCategoria,
  money,
  moneySigned,
  nombreDia,
  nombreMes,
  parsearMonto,
  getCategoryOptions,
  tiempoRelativo,
} from "../src/theme";
import { AmountInput, AppHeader, confirmDestructiveAction } from "../src/ui";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Home() {
  const state = useLukas();
  const { actualizarMovimiento, eliminarMovimiento } = state;
  const ahora = useMemo(() => new Date(), []);
  const r = useMemo(
    () => resumenMes(state, ahora),
    [state.movimientos, state.saldoInicial, state.mesSaldoInicial, ahora]
  );
  const delta = useMemo(
    () => deltaVsMesAnterior(state, ahora),
    [state.movimientos, state.saldoInicial, state.mesSaldoInicial, ahora]
  );
  const cuentas = useMemo(
    () => cuentasResumen(state),
    [state.movimientos, state.cuenta, state.saldoInicial]
  );
  const [busqueda, setBusqueda] = useState("");
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [movimientoEnEdicion, setMovimientoEnEdicion] =
    useState<(typeof state.movimientos)[number] | null>(null);
  const [montoEdicion, setMontoEdicion] = useState("");
  const [categoriaEdicion, setCategoriaEdicion] = useState("");
  const [detalleEdicion, setDetalleEdicion] = useState("");

  const recientes = useMemo(() => {
    const list = movimientosRecientes(state.movimientos, 12);
    const q = busqueda.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.categoria.toLowerCase().includes(q) ||
        (m.detalleCategoria ?? "").toLowerCase().includes(q) ||
        m.nota.toLowerCase().includes(q) ||
        m.cuenta.toLowerCase().includes(q)
    );
  }, [state.movimientos, busqueda]);

  const pendientes = useMemo(
    () => state.cuotas.filter((c) => !c.pagada).length,
    [state.cuotas]
  );
  const todayTotal = useMemo(() => {
    const todayKey = ahora.toDateString();
    return recientes
      .filter((m) => new Date(m.fecha).toDateString() === todayKey && m.tipo === "gasto")
      .reduce((sum, m) => sum + m.monto, 0);
  }, [ahora, recientes]);

  const abrirEdicion = (movimiento: (typeof state.movimientos)[number]) => {
    setMovimientoEnEdicion(movimiento);
    setMontoEdicion(formatearMontoEntrada(String(movimiento.monto)));
    setCategoriaEdicion(movimiento.categoria);
    setDetalleEdicion(movimiento.detalleCategoria ?? "");
  };

  const guardarEdicion = () => {
    if (!movimientoEnEdicion) return;
    const monto = parsearMonto(montoEdicion);
    if (monto === null) {
      Alert.alert("Monto inválido", "Ingresa un monto entero mayor que cero.");
      return;
    }
    if (categoriaEdicion === "Otros" && !detalleEdicion.trim()) {
      Alert.alert("Nombre requerido", "Escribe el nombre que identifica este movimiento de Otros.");
      return;
    }
    actualizarMovimiento(movimientoEnEdicion.id, {
      monto,
      categoria: categoriaEdicion,
      detalleCategoria:
        categoriaEdicion === "Otros" ? detalleEdicion.trim() : undefined,
    });
    setMovimientoEnEdicion(null);
  };

  const confirmarEliminacion = (id: string, titulo: string, monto: number) => {
    const mensaje = `¿Eliminar ${titulo} por ${money(monto)}? Esta acción no se puede deshacer.`;
    confirmDestructiveAction("Eliminar movimiento", mensaje, () => eliminarMovimiento(id));
  };

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader
        title={`Hola${state.currentUser?.nombre ? `, ${state.currentUser.nombre.split(/\s+/)[0]}` : ""}`}
        subtitle={nombreMes()}
        onSearch={() => setMostrarBusqueda((v) => !v)}
        onBell={() =>
          Alert.alert(
            "Avisos",
            pendientes
              ? `Tienes ${pendientes} cuota${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"}.`
              : "No tienes avisos pendientes."
          )
        }
      />

      {mostrarBusqueda && (
        <TextInput
          accessibilityLabel="Buscar movimientos"
          placeholder="Buscar movimiento"
          placeholderTextColor={colors.muted}
          value={busqueda}
          onChangeText={setBusqueda}
          style={styles.search}
        />
      )}

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Saldo total</Text>
        <View style={styles.heroRow}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.saldo}
          >
            {money(r.saldoFinal)}
          </Text>
          <View style={styles.deltaChip}>
            <Text style={styles.deltaChipTxt}>{moneySigned(delta.saldo)}</Text>
          </View>
        </View>
        <View style={styles.heroSplit}>
          <View style={styles.heroStat}>
            <View style={styles.incomeIcon}>
              <Text style={styles.heroGlyph}>↓</Text>
            </View>
            <View>
              <Text style={styles.heroAmount}>{moneySigned(r.ingresos)}</Text>
              <Text style={styles.heroMini}>Ingresos</Text>
            </View>
          </View>
          <View style={styles.heroStat}>
            <View style={styles.expenseIcon}>
              <Text style={styles.heroGlyph}>↑</Text>
            </View>
            <View>
              <Text style={styles.heroAmount}>{moneySigned(-r.gastos)}</Text>
              <Text style={styles.heroMini}>Gastos</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.accounts}>
        {cuentas.slice(0, 2).map((cuenta) => (
          <View key={cuenta.nombre} style={styles.account}>
            <View style={styles.accountIcon}>
              <Text style={styles.accountEmoji}>🏦</Text>
            </View>
            <Text style={styles.accountName} numberOfLines={1}>
              {cuenta.nombre}
            </Text>
            <Text style={styles.accountBal}>{money(cuenta.saldo)}</Text>
            <Text style={styles.accountSync}>
              {cuenta.last ? tiempoRelativo(cuenta.last) : "Sin movimientos"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Link href={{ pathname: "/explore", params: { tipo: "gasto" } }} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionDotRed}>●</Text>
            <Text style={styles.actionTxt}>Agregar gasto</Text>
          </Pressable>
        </Link>
        <Link href={{ pathname: "/explore", params: { tipo: "ingreso" } }} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionDotGreen}>●</Text>
            <Text style={styles.actionTxt}>Agregar ingreso</Text>
          </Pressable>
        </Link>
        <Pressable
          style={styles.action}
          onPress={() => Alert.alert("Sincronizado", "Tus cuentas locales ya están al día.")}
        >
          <Text style={styles.actionDotBlue}>↻</Text>
          <Text style={styles.actionTxt}>Sync</Text>
        </Pressable>
      </View>

      <View style={styles.txHead}>
        <Text style={styles.h}>Movimientos</Text>
        <Text style={styles.txSum}>{money(todayTotal)}</Text>
      </View>
      <Text style={styles.txDay}>Hoy · {nombreDia(new Date())}</Text>

      {recientes.length === 0 && (
        <Text style={styles.empty}>Todavía no hay movimientos. Usa + para anotar el primero.</Text>
      )}
      {recientes.map((m) => {
        const meta = metaCategoria(m.categoria);
        const movementTitle = m.detalleCategoria
          ? `${m.detalleCategoria} · ${m.categoria}`
          : meta.label;
        return (
          <View key={m.id} style={styles.tx}>
            <View style={[styles.txIcon, { backgroundColor: `${meta.color}22` }]}>
              <Text>{meta.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>{movementTitle}</Text>
              <Text style={styles.txNote}>
                {m.nota || m.categoria} · {m.cuenta}
              </Text>
            </View>
            <View style={styles.txRight}>
              <Text
                style={[
                  styles.txAmt,
                  {
                    color:
                      m.tipo === "gasto"
                        ? colors.danger
                        : m.tipo === "ingreso"
                          ? colors.mint
                          : colors.blue,
                  },
                ]}
              >
                {m.tipo === "gasto" ? "−" : m.tipo === "ingreso" ? "+" : "↔ "}
                {money(m.monto)}
              </Text>
              <Text style={styles.txTax}>
                {new Date(m.fecha).toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <View style={styles.txActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${movementTitle}`}
                  hitSlop={6}
                  onPress={() => abrirEdicion(m)}
                >
                  <Text style={styles.editAction}>Editar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar ${movementTitle}`}
                  hitSlop={6}
                  onPress={() => confirmarEliminacion(m.id, movementTitle, m.monto)}
                >
                  <Text style={styles.deleteAction}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
      <Modal
        visible={movimientoEnEdicion !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMovimientoEnEdicion(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>Editar movimiento</Text>
            <AmountInput
              accessibilityLabel="Monto editado"
              placeholder="Monto"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={montoEdicion}
              onChangeText={setMontoEdicion}
              style={styles.editInput}
            />
            <Text style={styles.editLabel}>Categoría</Text>
            <View style={styles.editCategories}>
              {getCategoryOptions(movimientoEnEdicion?.tipo ?? "gasto").map((categoria) => (
                <Pressable
                  key={categoria}
                  accessibilityRole="button"
                  accessibilityState={{ selected: categoria === categoriaEdicion }}
                  onPress={() => setCategoriaEdicion(categoria)}
                  style={[
                    styles.editChip,
                    categoria === categoriaEdicion && styles.editChipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.editChipText,
                      categoria === categoriaEdicion && styles.editChipTextOn,
                    ]}
                  >
                    {categoria}
                  </Text>
                </Pressable>
              ))}
            </View>
            {categoriaEdicion === "Otros" && (
              <TextInput
                accessibilityLabel="Nombre del movimiento de Otros"
                placeholder="Nombre (ej. Mascota)"
                placeholderTextColor={colors.muted}
                value={detalleEdicion}
                onChangeText={setDetalleEdicion}
                style={styles.editInput}
              />
            )}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMovimientoEnEdicion(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={guardarEdicion}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  search: {
    backgroundColor: colors.card,
    color: colors.ink,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    backgroundColor: colors.yellow,
    borderRadius: 26,
    padding: 18,
    gap: 10,
  },
  heroLabel: { color: "#5B5E2A", fontSize: 13, fontWeight: "700", textAlign: "center" },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saldo: { color: colors.yellowInk, fontSize: 34, fontWeight: "800", maxWidth: "78%" },
  deltaChip: {
    backgroundColor: "#DDEA4A",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deltaChipTxt: { color: "#1F7A4D", fontWeight: "800", fontSize: 12 },
  heroSplit: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 8 },
  incomeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1F7A4D",
    alignItems: "center",
    justifyContent: "center",
  },
  expenseIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#C23B3B",
    alignItems: "center",
    justifyContent: "center",
  },
  heroGlyph: { color: "#fff", fontWeight: "800" },
  heroAmount: { color: colors.yellowInk, fontWeight: "800", fontSize: 16 },
  heroMini: { color: "#5B5E2A", fontSize: 12, fontWeight: "600" },
  accounts: { flexDirection: "row", gap: 10 },
  account: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 14,
    gap: 6,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  accountEmoji: { fontSize: 16 },
  accountName: { color: colors.muted, fontWeight: "700" },
  accountBal: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  accountSync: { color: colors.muted, fontSize: 11 },
  actions: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  actionTxt: { color: colors.ink, fontWeight: "700", fontSize: 11, flexShrink: 1 },
  actionDotRed: { color: colors.danger, fontSize: 12 },
  actionDotGreen: { color: colors.mint, fontSize: 12 },
  actionDotBlue: { color: colors.blue, fontSize: 14 },
  h: { fontWeight: "800", color: colors.ink, fontSize: 18 },
  txHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  txSum: { color: colors.ink, fontWeight: "800" },
  txDay: { color: colors.muted, marginTop: -8 },
  empty: { color: colors.muted, textAlign: "center", padding: 16 },
  tx: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  txRight: { alignItems: "flex-end", gap: 3 },
  txActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 3 },
  editAction: { color: colors.blue, fontWeight: "700", fontSize: 12 },
  deleteAction: { color: colors.danger, fontWeight: "700", fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "center",
    padding: 20,
  },
  editModal: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  editTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  editLabel: { color: colors.muted, fontWeight: "700" },
  editInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editCategories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  editChip: {
    backgroundColor: colors.bgElevated,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editChipOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  editChipText: { color: colors.ink, fontWeight: "600" },
  editChipTextOn: { color: colors.yellowInk },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 12 },
  cancelButtonText: { color: colors.muted, fontWeight: "700" },
  saveButton: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  saveButtonText: { color: colors.yellowInk, fontWeight: "700" },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { color: colors.ink, fontWeight: "800" },
  txNote: { color: colors.muted, fontSize: 12, marginTop: 2 },
  txAmt: { fontWeight: "800" },
  txTax: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
