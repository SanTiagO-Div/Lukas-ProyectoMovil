import { useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ResponsivePage } from "../src/ResponsivePage";
import { crearMensajeCobro } from "../src/debts";
import { useLukas } from "../src/store";
import { colors, money, parsearMonto } from "../src/theme";
import { AmountInput, AppHeader } from "../src/ui";

type TipoDeuda = "pagar" | "cobrar";

export default function Deudas() {
  const { cuotas, alternarCuota, agregarCuota } = useLukas();
  const [tipo, setTipo] = useState<TipoDeuda>("pagar");
  const [nombre, setNombre] = useState("");
  const [persona, setPersona] = useState("");
  const [monto, setMonto] = useState("");

  const pendientes = cuotas.filter((cuota) => !cuota.pagada);
  const porPagar = pendientes.filter((cuota) => cuota.tipo === "pagar");
  const porCobrar = pendientes.filter((cuota) => cuota.tipo === "cobrar");
  const lista = cuotas.filter((cuota) => cuota.tipo === tipo);
  const totalPendiente = (deudas: typeof pendientes) =>
    deudas.reduce((total, cuota) => total + cuota.monto, 0);

  const agregar = () => {
    const amount = parsearMonto(monto);
    if (!nombre.trim() || amount === null || (tipo === "cobrar" && !persona.trim())) {
      Alert.alert(
        "Datos inválidos",
        tipo === "cobrar"
          ? "Escribe una descripción, quién te debe y un monto mayor que cero."
          : "Escribe un nombre y un monto mayor que cero."
      );
      return;
    }

    agregarCuota({
      nombre: nombre.trim(),
      persona: tipo === "cobrar" ? persona.trim() : undefined,
      monto: amount,
      pagada: false,
      tipo,
    });
    setNombre("");
    setPersona("");
    setMonto("");
  };

  const compartirCobro = async (nombrePersona: string, valor: number) => {
    try {
      await Share.share({ message: crearMensajeCobro(nombrePersona, valor) });
    } catch (error) {
      Alert.alert(
        "No se pudo compartir el cobro",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    }
  };

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader title="Por pagar y cobrar" showBack />
      <Text style={styles.description}>
        Organiza en un solo lugar los pagos que debes y el dinero que te deben.
      </Text>

      <View style={styles.summaryRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tipo === "pagar" }}
          onPress={() => setTipo("pagar")}
          style={[styles.summaryCard, tipo === "pagar" && styles.summarySelected]}
        >
          <Text style={styles.summaryLabel}>Por pagar</Text>
          <Text style={[styles.summaryTotal, styles.payText]}>
            {money(totalPendiente(porPagar))}
          </Text>
          <Text style={styles.summaryCount}>{porPagar.length} pendiente(s)</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tipo === "cobrar" }}
          onPress={() => setTipo("cobrar")}
          style={[styles.summaryCard, tipo === "cobrar" && styles.summarySelected]}
        >
          <Text style={styles.summaryLabel}>Por cobrar</Text>
          <Text style={[styles.summaryTotal, styles.collectText]}>
            {money(totalPendiente(porCobrar))}
          </Text>
          <Text style={styles.summaryCount}>{porCobrar.length} pendiente(s)</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>
          {tipo === "pagar" ? "Agregar pago pendiente" : "Agregar dinero por cobrar"}
        </Text>
        <TextInput
          accessibilityLabel={tipo === "pagar" ? "Nombre del pago" : "Descripción de la deuda"}
          placeholder={tipo === "pagar" ? "Ej. Arriendo" : "Ej. Cena del viernes"}
          placeholderTextColor={colors.muted}
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
        />
        {tipo === "cobrar" && (
          <TextInput
            accessibilityLabel="Nombre de quien debe"
            placeholder="¿Quién te debe?"
            placeholderTextColor={colors.muted}
            value={persona}
            onChangeText={setPersona}
            style={styles.input}
          />
        )}
        <AmountInput
          accessibilityLabel={tipo === "pagar" ? "Monto del pago" : "Monto por cobrar"}
          placeholder="Monto"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" style={styles.addButton} onPress={agregar}>
          <Text style={styles.addButtonText}>
            {tipo === "pagar" ? "Agregar pago" : "Agregar deuda"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>
        {tipo === "pagar" ? "Tus pagos" : "Dinero que te deben"}
      </Text>
      {lista.map((cuota) => (
        <View key={cuota.id} style={styles.debtCard}>
          <View style={styles.debtHeading}>
            <View style={styles.debtInfo}>
              <Text style={styles.debtName}>{cuota.nombre}</Text>
              {tipo === "cobrar" && cuota.persona ? (
                <Text style={styles.person}>Debe: {cuota.persona}</Text>
              ) : null}
            </View>
            <Text style={[styles.debtAmount, tipo === "pagar" ? styles.payText : styles.collectText]}>
              {money(cuota.monto)}
            </Text>
          </View>
          <Text style={[styles.status, cuota.pagada && styles.statusDone]}>
            {cuota.pagada
              ? tipo === "pagar" ? "Pagado" : "Cobrado"
              : "Pendiente"}
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.actionButton}
              onPress={() => alternarCuota(cuota.id)}
            >
              <Text style={styles.actionButtonText}>
                {cuota.pagada
                  ? "Marcar pendiente"
                  : tipo === "pagar" ? "Marcar pagado" : "Marcar cobrado"}
              </Text>
            </Pressable>
            {tipo === "cobrar" && !cuota.pagada && (
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => compartirCobro(cuota.persona || "amigo", cuota.monto)}
              >
                <Text style={styles.secondaryButtonText}>Enviar cobro</Text>
              </Pressable>
            )}
          </View>
          {tipo === "cobrar" && !cuota.pagada && (
            <Text style={styles.message}>
              {crearMensajeCobro(cuota.persona || "amigo", cuota.monto)}
            </Text>
          )}
        </View>
      ))}
      {lista.length === 0 && (
        <Text style={styles.empty}>
          {tipo === "pagar" ? "No tienes pagos registrados." : "No tienes deudas por cobrar."}
        </Text>
      )}
      <Text style={styles.note}>
        Marcar un pago o cobro actualiza su estado, pero no registra un movimiento.
        Anótalo también en Movimientos para incluirlo en tus finanzas.
      </Text>
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  description: { color: colors.muted, lineHeight: 20 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  summarySelected: { borderColor: colors.yellow },
  summaryLabel: { color: colors.ink, fontWeight: "700" },
  summaryTotal: { fontSize: 17, fontWeight: "800" },
  summaryCount: { color: colors.muted, fontSize: 12 },
  payText: { color: colors.danger },
  collectText: { color: colors.mint },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12 },
  formTitle: { color: colors.ink, fontWeight: "700" },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.yellow,
    padding: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: colors.yellowInk, fontWeight: "700" },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginTop: 4 },
  debtCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 10 },
  debtHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  debtInfo: { flex: 1, gap: 4 },
  debtName: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  person: { color: colors.muted, fontSize: 13 },
  debtAmount: { fontWeight: "800", fontSize: 17 },
  status: {
    alignSelf: "flex-start",
    backgroundColor: "#3A2230",
    color: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700",
    overflow: "hidden",
  },
  statusDone: { backgroundColor: "#1E3A32", color: colors.mint },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: {
    backgroundColor: colors.yellow,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: "center",
  },
  actionButtonText: { color: colors.yellowInk, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: colors.soft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: "center",
  },
  secondaryButtonText: { color: colors.ink, fontWeight: "700" },
  message: { color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, textAlign: "center", padding: 16 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
});
