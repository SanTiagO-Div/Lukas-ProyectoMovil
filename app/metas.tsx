import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ResponsivePage } from "../src/ResponsivePage";
import { useLukas } from "../src/store";
import { colors, money, parsearMonto } from "../src/theme";
import { AmountInput, AppHeader } from "../src/ui";

export default function Metas() {
  const state = useLukas();
  const [nombreMeta, setNombreMeta] = useState("");
  const [objetivoMeta, setObjetivoMeta] = useState("");

  const crearMeta = () => {
    const nombre = nombreMeta.trim();
    const objetivo = parsearMonto(objetivoMeta);
    if (!nombre || objetivo === null) {
      Alert.alert("Datos inválidos", "Escribe un nombre y un objetivo mayor que cero.");
      return;
    }

    const fechaMeta = new Date();
    fechaMeta.setFullYear(fechaMeta.getFullYear() + 1);
    state.agregarMeta({
      nombre,
      objetivo,
      emoji: "🎯",
      fechaMeta: fechaMeta.toISOString().slice(0, 10),
    });
    setNombreMeta("");
    setObjetivoMeta("");
  };

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader title="Metas de ahorro" showBack />
      <Text style={styles.description}>
        Define objetivos y registra tus aportes para seguir tu progreso.
      </Text>
      {state.metas.length === 0 && (
        <Text style={styles.empty}>Todavía no tienes metas de ahorro.</Text>
      )}
      {state.metas.map((meta) => {
        const pct = meta.objetivo > 0 ? Math.min(1, meta.aportado / meta.objetivo) : 0;
        return (
          <View key={meta.id} style={styles.card}>
            <Text style={styles.title}>
              {meta.emoji} {meta.nombre}
            </Text>
            <Text style={styles.amounts}>
              {money(meta.aportado)} de {money(meta.objetivo)}
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
              style={styles.bar}
            >
              <View style={[styles.fill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={styles.progress}>{Math.round(pct * 100)}% completado</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.contribute}
              onPress={() => state.aportarMeta(meta.id, 50000)}
            >
              <Text style={styles.contributeText}>Aportar $50.000</Text>
            </Pressable>
          </View>
        );
      })}
      <View style={styles.card}>
        <Text style={styles.title}>Crear una meta</Text>
        <TextInput
          accessibilityLabel="Nombre de la meta"
          placeholder="Ej. Viaje"
          placeholderTextColor={colors.muted}
          value={nombreMeta}
          onChangeText={setNombreMeta}
          style={styles.input}
        />
        <AmountInput
          accessibilityLabel="Monto objetivo"
          placeholder="Monto objetivo"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={objetivoMeta}
          onChangeText={setObjetivoMeta}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" style={styles.button} onPress={crearMeta}>
          <Text style={styles.buttonText}>Agregar meta</Text>
        </Pressable>
      </View>
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  description: { color: colors.muted, lineHeight: 20 },
  empty: { color: colors.muted, textAlign: "center", padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12 },
  title: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  amounts: { color: colors.muted },
  bar: { height: 8, backgroundColor: colors.soft, borderRadius: 8, overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.yellow },
  progress: { color: colors.muted, fontSize: 12 },
  contribute: { alignSelf: "flex-start", paddingVertical: 4 },
  contributeText: { color: colors.yellow, fontWeight: "700" },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.yellow,
    padding: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.yellowInk, fontWeight: "700" },
});
