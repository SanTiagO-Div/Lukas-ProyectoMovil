import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { gastosPorDetalleOtros } from "../src/finance";
import { movimientosDelMes, useLukas } from "../src/store";
import { colors, getCategoryOptions, money } from "../src/theme";
import { AppHeader } from "../src/ui";
import { ResponsivePage } from "../src/ResponsivePage";

export default function GastosCategoria() {
  const state = useLukas();
  const mesActual = useMemo(() => new Date(), []);
  const gastosDelMes = movimientosDelMes(state.movimientos, mesActual).filter(
    (movimiento) => movimiento.tipo === "gasto"
  );
  const categorias = Array.from(
    new Set([
      ...getCategoryOptions("gasto"),
      ...gastosDelMes.map((movimiento) => movimiento.categoria),
    ])
  );
  const gastosPorCategoria = categorias
    .map((categoria) => ({
      categoria,
      total: gastosDelMes
        .filter((movimiento) => movimiento.categoria === categoria)
        .reduce((total, movimiento) => total + movimiento.monto, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const detallesOtros = gastosPorDetalleOtros(gastosDelMes);

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader title="Gastos por categoría" showBack />
      <Text style={styles.description}>
        Gastos registrados durante este mes, agrupados por categoría.
      </Text>
      {gastosPorCategoria.map(({ categoria, total }) => (
        <View key={categoria} style={styles.categoryGroup}>
          <View style={styles.line}>
            <Text style={styles.category}>{categoria}</Text>
            <Text style={styles.amount}>{money(total)}</Text>
          </View>
          {categoria === "Otros" &&
            detallesOtros.map((detalle) => (
              <View key={detalle.nombre} style={styles.detailLine}>
                <Text style={styles.detailName}>{detalle.nombre}</Text>
                <Text style={styles.detailAmount}>{money(detalle.total)}</Text>
              </View>
            ))}
        </View>
      ))}
      {gastosDelMes.length === 0 && (
        <Text style={styles.empty}>Todavía no hay gastos registrados este mes.</Text>
      )}
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  description: { color: colors.muted, lineHeight: 20 },
  categoryGroup: { gap: 5 },
  line: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  category: { color: colors.ink, fontWeight: "600" },
  amount: { color: colors.danger, fontWeight: "700" },
  detailLine: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailName: { color: colors.muted, flex: 1 },
  detailAmount: { color: colors.muted, fontWeight: "600" },
  empty: { color: colors.muted, textAlign: "center", padding: 16 },
});
