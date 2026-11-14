import { useLukas } from "../src/store";
import { ResponsivePage } from "../src/ResponsivePage";
import { colors, money, parsearMonto } from "../src/theme";
import { AmountInput, AppHeader } from "../src/ui";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Pagar() {
  const { cuotas, alternarCuota, agregarCuota } = useLukas();
  const lista = cuotas.filter((c) => c.tipo === "pagar");
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader title="Por pagar" showBack />
      <Text style={styles.p}>
        Marca la cuota cuando salga de tu cuenta. El estado no registra un gasto:
        anótalo también en Movimientos si quieres incluirlo en tu presupuesto.
      </Text>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Agregar pago</Text>
        <TextInput
          accessibilityLabel="Nombre del pago"
          placeholder="Ej. Arriendo"
          placeholderTextColor={colors.muted}
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
        />
        <AmountInput
          accessibilityLabel="Monto del pago"
          placeholder="Monto"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
          style={styles.input}
        />
        <Pressable
          style={styles.addButton}
          onPress={() => {
            const amount = parsearMonto(monto);
            if (!nombre.trim() || amount === null) {
              Alert.alert(
                "Datos inválidos",
                "Escribe un nombre y un monto mayor que cero."
              );
              return;
            }
            agregarCuota({
              nombre: nombre.trim(),
              monto: amount,
              pagada: false,
              tipo: "pagar",
            });
            setNombre("");
            setMonto("");
          }}
        >
          <Text style={styles.addButtonText}>Agregar pago</Text>
        </Pressable>
      </View>
      {lista.map((c) => (
        <Pressable key={c.id} style={styles.card} onPress={() => alternarCuota(c.id)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{c.nombre}</Text>
            <Text style={styles.monto}>{money(c.monto)}</Text>
          </View>
          <Text style={[styles.badge, c.pagada && styles.ok]}>
            {c.pagada ? "Pagada" : "Pendiente"}
          </Text>
        </Pressable>
      ))}
      {lista.length === 0 && (
        <Text style={styles.empty}>No tienes pagos registrados.</Text>
      )}
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  p: { color: colors.muted, lineHeight: 20, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: { fontWeight: "700", color: colors.ink },
  monto: { color: colors.danger, fontWeight: "700", marginTop: 4 },
  badge: {
    backgroundColor: "#3A2230",
    color: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700",
    overflow: "hidden",
  },
  ok: { backgroundColor: "#1E3A32", color: colors.mint },
  form: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  formTitle: { fontWeight: "700", color: colors.ink },
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
  empty: { color: colors.muted, textAlign: "center", padding: 16 },
});
