import { useLukas } from "../src/store";
import { ResponsivePage } from "../src/ResponsivePage";
import {
  colors,
  getCategoryOptions,
  metaCategoria,
  money,
  parsearMonto,
} from "../src/theme";
import {
  AmountInput,
  AppHeader,
  confirmDestructiveAction,
} from "../src/ui";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Explore() {
  const { agregarMovimiento, eliminarMovimiento, movimientos, cuenta } = useLukas();
  const {
    tipo: tipoParam,
    categoria: categoriaParam,
    detalleCategoria: detalleParam,
  } = useLocalSearchParams<{
    tipo?: string;
    categoria?: string;
    detalleCategoria?: string;
  }>();
  const [tipo, setTipo] = useState<"gasto" | "ingreso" | "traslado">(
    tipoParam === "ingreso" ? "ingreso" : "gasto"
  );
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState(
    tipoParam === "ingreso" ? "Salario" : "Comer afuera"
  );
  const [detalleCategoria, setDetalleCategoria] = useState("");
  const [nota, setNota] = useState("");
  const [cuentaMovimiento, setCuentaMovimiento] = useState(cuenta);

  useEffect(() => {
    if (tipoParam !== "gasto" && tipoParam !== "ingreso") return;
    setTipo(tipoParam);
    const categoriasValidas = getCategoryOptions(tipoParam);
    const categoriaInicial =
      categoriaParam && categoriasValidas.includes(categoriaParam)
        ? categoriaParam
        : tipoParam === "ingreso" ? "Salario" : "Comer afuera";
    setCategoria(categoriaInicial);
    setDetalleCategoria(categoriaInicial === "Otros" ? detalleParam ?? "" : "");
  }, [tipoParam, categoriaParam, detalleParam]);

  const guardar = () => {
    const n = parsearMonto(monto);
    if (n === null) {
      Alert.alert("Monto inválido", "Ingresa un monto mayor que cero.");
      return;
    }
    if (!cuentaMovimiento.trim()) {
      Alert.alert("Cuenta", "Escribe la cuenta desde la que se hizo el movimiento.");
      return;
    }
    if (tipo === "gasto" && categoria === "Otros" && !detalleCategoria.trim()) {
      Alert.alert("Detalle requerido", "Escribe a qué corresponde este gasto de Otros.");
      return;
    }
    agregarMovimiento({
      tipo,
      monto: n,
      categoria: tipo === "traslado" ? "Traslado" : categoria,
      ...(tipo === "gasto" && categoria === "Otros"
        ? { detalleCategoria: detalleCategoria.trim() }
        : {}),
      nota: nota.trim(),
      cuenta: cuentaMovimiento.trim(),
    });
    setMonto("");
    setNota("");
    setDetalleCategoria("");
    Alert.alert("Listo", "Movimiento guardado. No se borra ninguno.");
  };

  const pantallazo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permiso necesario",
          "Permite el acceso a tus fotos para seleccionar un pantallazo."
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.6,
      });
      if (res.canceled) return;

      Alert.alert(
        "Lectura no disponible",
        "El pantallazo no se registró como movimiento porque esta versión no incluye OCR. Ingresa el monto y guárdalo manualmente."
      );
    } catch (error) {
      Alert.alert(
        "No se pudo seleccionar la imagen",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    }
  };

  const confirmarEliminacion = (id: string, categoriaMov: string, montoMov: number) => {
    const mensaje = `¿Eliminar ${categoriaMov} por ${money(montoMov)}? Esta acción actualizará tus totales y no se puede deshacer.`;
    confirmDestructiveAction("Eliminar movimiento", mensaje, () => eliminarMovimiento(id));
  };

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader title="Nuevo movimiento" showBack />
      <View style={styles.tabs}>
        {(["gasto", "ingreso", "traslado"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              setTipo(t);
              setDetalleCategoria("");
              if (t === "ingreso") setCategoria("Salario");
              else if (t === "gasto") setCategoria("Comer afuera");
            }}
            style={[styles.tab, tipo === t && styles.tabOn]}
          >
            <Text style={[styles.tabTxt, tipo === t && styles.tabTxtOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <AmountInput
        accessibilityLabel="Monto del movimiento"
        placeholder="Monto"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
        value={monto}
        onChangeText={setMonto}
        style={styles.input}
      />
      {tipo !== "traslado" && (
        <View style={styles.cats}>
          {getCategoryOptions(tipo)
            .filter((category) => tipo !== "gasto" || category !== "Educación")
            .map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategoria(c)}
                style={[styles.chip, categoria === c && styles.chipOn]}
              >
                <Text style={[styles.chipTxt, categoria === c && styles.chipTxtOn]}>
                  {c}
                </Text>
              </Pressable>
            ))}
        </View>
      )}
      {tipo === "gasto" && categoria === "Otros" && (
        <TextInput
          accessibilityLabel="Detalle de la categoría Otros"
          placeholder="¿A qué corresponde? Ej. Mascota"
          placeholderTextColor={colors.muted}
          value={detalleCategoria}
          onChangeText={setDetalleCategoria}
          style={styles.input}
        />
      )}
      <TextInput
        accessibilityLabel="Cuenta del movimiento"
        placeholder="Cuenta (ej. Nequi)"
        placeholderTextColor={colors.muted}
        value={cuentaMovimiento}
        onChangeText={setCuentaMovimiento}
        style={styles.input}
      />
      <TextInput
        accessibilityLabel="Nota del movimiento"
        placeholder="Nota (opcional)"
        placeholderTextColor={colors.muted}
        value={nota}
        onChangeText={setNota}
        style={styles.input}
      />
      <Pressable style={styles.btn} onPress={guardar}>
        <Text style={styles.btnTxt}>Guardar</Text>
      </Pressable>
      <Pressable style={styles.btnAlt} onPress={pantallazo}>
        <Text style={styles.btnAltTxt}>Seleccionar pantallazo (sin OCR)</Text>
      </Pressable>
      <Text style={styles.h}>Últimos movimientos</Text>
      {movimientos.slice(0, 12).map((m) => {
        const meta = metaCategoria(m.categoria);
        return (
          <View key={m.id} style={styles.row}>
            <View style={styles.movementInfo}>
              <Text style={styles.cat}>
                {meta.emoji} {m.categoria}
                {m.detalleCategoria ? ` · ${m.detalleCategoria}` : ""}
              </Text>
              <Text style={styles.note}>
                {[m.nota || m.tipo, m.cuenta, new Date(m.fecha).toLocaleDateString("es-CO")]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            <View style={styles.movementActions}>
              <Text
                style={[
                  styles.amount,
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
                {m.tipo === "gasto" ? "-" : m.tipo === "ingreso" ? "+" : "↔ "}
                {money(m.monto)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${m.categoria} por ${money(m.monto)}`}
                onPress={() => confirmarEliminacion(m.id, m.categoria, m.monto)}
                hitSlop={8}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      {movimientos.length === 0 && (
        <Text style={styles.empty}>Todavía no hay movimientos registrados.</Text>
      )}
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.card, alignItems: "center" },
  tabOn: { backgroundColor: colors.yellow },
  tabTxt: { fontWeight: "700", color: colors.ink, textTransform: "capitalize" },
  tabTxtOn: { color: colors.yellowInk },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    minHeight: 50,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  chipTxt: { fontWeight: "600", color: colors.ink },
  chipTxtOn: { color: colors.yellowInk },
  btn: {
    backgroundColor: colors.yellow,
    padding: 14,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: colors.yellowInk, fontWeight: "800" },
  btnAlt: {
    backgroundColor: colors.card,
    padding: 14,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnAltTxt: { color: colors.ink, fontWeight: "800" },
  h: { fontWeight: "800", marginTop: 8, color: colors.ink },
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  movementInfo: { flex: 1, gap: 2 },
  movementActions: { alignItems: "flex-end", gap: 6 },
  amount: { fontWeight: "800" },
  deleteButton: { paddingVertical: 4, paddingHorizontal: 6 },
  deleteText: { color: colors.danger, fontWeight: "700", fontSize: 12 },
  cat: { fontWeight: "700", color: colors.ink },
  note: { color: colors.muted, fontSize: 12 },
  empty: { color: colors.muted, textAlign: "center", padding: 16 },
});
