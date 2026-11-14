import { useLukas } from "../src/store";
import { ResponsivePage } from "../src/ResponsivePage";
import { crearMensajeCobro } from "../src/debts";
import { colors, money, parsearMonto } from "../src/theme";
import { AmountInput, AppHeader } from "../src/ui";
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

export default function Cobrar() {
  const { cuotas, alternarCuota, agregarCuota } = useLukas();
  const lista = cuotas.filter((c) => c.tipo === "cobrar");
  const [nombre, setNombre] = useState("");
  const [persona, setPersona] = useState("");
  const [monto, setMonto] = useState("");

  const compartir = async (nombrePersona: string, valor: number) => {
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
      <AppHeader title="Por cobrar" showBack />
      <Text style={styles.p}>
        Prepara un mensaje para cobrar. Marcar una deuda como cobrada solo
        actualiza su estado; registra el ingreso en Movimientos para incluirlo
        en tu presupuesto.
      </Text>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Agregar deuda por cobrar</Text>
        <TextInput
          accessibilityLabel="Descripción de la deuda"
          placeholder="Ej. Cena del viernes"
          placeholderTextColor={colors.muted}
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Nombre de la persona"
          placeholder="¿Quién te debe?"
          placeholderTextColor={colors.muted}
          value={persona}
          onChangeText={setPersona}
          style={styles.input}
        />
        <AmountInput
          accessibilityLabel="Monto por cobrar"
          placeholder="Monto"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
          style={styles.input}
        />
        <Pressable
          style={styles.btn}
          onPress={() => {
            const amount = parsearMonto(monto);
            if (!nombre.trim() || amount === null) {
              Alert.alert(
                "Datos inválidos",
                "Escribe una descripción y un monto mayor que cero."
              );
              return;
            }
            agregarCuota({
              nombre: nombre.trim(),
              persona: persona.trim() || undefined,
              monto: amount,
              pagada: false,
              tipo: "cobrar",
            });
            setNombre("");
            setPersona("");
            setMonto("");
          }}
        >
          <Text style={styles.btnTxt}>Agregar deuda</Text>
        </Pressable>
      </View>
      {lista.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.name}>{c.nombre}</Text>
          <Text style={styles.monto}>{money(c.monto)}</Text>
          <View style={styles.row}>
            <Pressable style={styles.btn} onPress={() => alternarCuota(c.id)}>
              <Text style={styles.btnTxt}>{c.pagada ? "Pendiente" : "Marcar cobrado"}</Text>
            </Pressable>
            <Pressable
              style={styles.btnAlt}
              onPress={() => compartir(c.persona || "amigo", c.monto)}
            >
              <Text style={styles.btnAltTxt}>Enviar cobro</Text>
            </Pressable>
          </View>
          <Text style={styles.msg}>
            {crearMensajeCobro(c.persona || "amigo", c.monto)}
          </Text>
        </View>
      ))}
      {lista.length === 0 && (
        <Text style={styles.empty}>No tienes deudas registradas.</Text>
      )}
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  p: { color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  name: { fontWeight: "700", color: colors.ink, fontSize: 16 },
  monto: { color: colors.mint, fontWeight: "800", fontSize: 20 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: {
    backgroundColor: colors.yellow,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: "center",
  },
  btnTxt: { color: colors.yellowInk, fontWeight: "700" },
  btnAlt: {
    backgroundColor: colors.soft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: "center",
  },
  btnAltTxt: { color: colors.ink, fontWeight: "700" },
  msg: { color: colors.muted, fontSize: 13 },
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
  empty: { color: colors.muted, textAlign: "center", padding: 16 },
});
