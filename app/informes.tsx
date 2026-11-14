import { resumenMes, useLukas } from "../src/store";
import { ResponsivePage } from "../src/ResponsivePage";
import { DonutChart, LineChart } from "../src/charts";
import {
  deltaVsMesAnterior,
  gastosPorCategoria,
  picoIngreso,
  promedioGastosMensual,
  serieIngresoGasto,
  type RangoSerie,
} from "../src/stats";
import { colors, money, moneySigned, nombreMes } from "../src/theme";
import { AppHeader } from "../src/ui";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

const RANGOS: RangoSerie[] = ["7D", "1M", "3M", "6M", "1Y"];

export default function Informes() {
  const state = useLukas();
  const ahora = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<"categorias" | "mensual">("categorias");
  const [rango, setRango] = useState<RangoSerie>("6M");
  const r = useMemo(
    () => resumenMes(state, ahora),
    [state.movimientos, state.saldoInicial, state.mesSaldoInicial, ahora]
  );
  const cats = useMemo(
    () => gastosPorCategoria(state, ahora),
    [state.movimientos, ahora]
  );
  const delta = useMemo(
    () => deltaVsMesAnterior(state, ahora),
    [state.movimientos, state.saldoInicial, state.mesSaldoInicial, ahora]
  );
  const avg = useMemo(
    () => promedioGastosMensual(state, 6, ahora),
    [state.movimientos, state.saldoInicial, state.mesSaldoInicial, ahora]
  );
  const pico = useMemo(
    () => picoIngreso(state, ahora),
    [state.movimientos, state.saldoInicial, state.mesSaldoInicial, ahora]
  );
  const serie = useMemo(
    () => serieIngresoGasto(state.movimientos, rango, ahora),
    [state.movimientos, rango, ahora]
  );

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader
        title="Estadísticas"
        showBack
        onSearch={() => Alert.alert("Buscar", "Filtra categorías desde el resumen del mes.")}
        onBell={() => Alert.alert("Avisos", "Tu resumen de este mes ya está actualizado.")}
      />

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("categorias")}
          style={[styles.tab, tab === "categorias" && styles.tabOn]}
        >
          <Text style={[styles.tabTxt, tab === "categorias" && styles.tabTxtOn]}>
            Categorías
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("mensual")}
          style={[styles.tab, tab === "mensual" && styles.tabOn]}
        >
          <Text style={[styles.tabTxt, tab === "mensual" && styles.tabTxtOn]}>
            Gasto mensual
          </Text>
        </Pressable>
      </View>

      {tab === "categorias" ? (
        <>
          <View style={styles.donutCard}>
            <DonutChart
              slices={
                cats.length
                  ? cats.map((c) => ({ color: c.color, value: c.monto }))
                  : [{ color: colors.border, value: 1 }]
              }
            >
              <Text style={styles.wallet}>👛</Text>
              <Text style={[styles.donutAmt, styles.negativeAmount]}>
                {moneySigned(-r.gastos)}
              </Text>
              <Text style={styles.donutSub}>{nombreMes()}</Text>
            </DonutChart>
          </View>

          <View style={styles.grid}>
            {cats.length === 0 && (
              <Text style={styles.empty}>Aún no hay gastos este mes para agrupar.</Text>
            )}
            {cats.map((c) => (
              <View key={c.categoria} style={styles.catCard}>
                <View style={styles.catTop}>
                  <View style={[styles.catIcon, { backgroundColor: `${c.color}22` }]}>
                    <Text>{c.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{c.label}</Text>
                    <Text style={styles.catCount}>
                      {c.count} movimiento{c.count === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.catAmt, styles.negativeAmount]}>
                  {moneySigned(-c.monto)}
                </Text>
                <View style={styles.catFooter}>
                  <Text
                    style={[
                      styles.catDelta,
                      delta.gastos > 0 && styles.negativeAmount,
                    ]}
                  >
                    {delta.gastos === 0 ? "Sin cambio" : moneySigned(-Math.round(c.pct * Math.abs(delta.gastos)))}
                  </Text>
                  <View style={styles.pctWrap}>
                    <View style={[styles.pctBar, { width: `${Math.round(c.pct * 100)}%`, backgroundColor: c.color }]} />
                  </View>
                  <Text style={styles.pctTxt}>{Math.round(c.pct * 100)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.monthCard}>
            <View style={styles.monthHead}>
              <View>
                <Text style={styles.heroLabel}>Gasto mensual promedio</Text>
                <Text style={styles.big}>{money(avg || r.gastos)}</Text>
                <Text style={[styles.change, delta.gastos <= 0 ? styles.up : styles.down]}>
                  {moneySigned(delta.gastos)} vs mes anterior
                </Text>
              </View>
              <Text style={styles.more}>···</Text>
            </View>
            <View style={styles.legend}>
              <Text style={styles.legI}>● Neto positivo</Text>
              <Text style={styles.legE}>● Neto negativo</Text>
            </View>
            <LineChart
              values={serie.map((s) => s.ingresos - s.gastos)}
              labels={serie.map((s) => s.label)}
            />
            <View style={styles.ranges}>
              {RANGOS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setRango(item)}
                  style={[styles.range, rango === item && styles.rangeOn]}
                >
                  <Text style={[styles.rangeTxt, rango === item && styles.rangeTxtOn]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.insights}>
            <View style={styles.insight}>
              <Text style={styles.insightIcon}>📈</Text>
              <Text style={styles.insightTxt}>
                Tu ingreso más alto fue en{" "}
                {pico.fecha.toLocaleDateString("es-CO", { month: "long" })} con{" "}
                {money(pico.monto)}.
              </Text>
            </View>
            <View style={styles.insight}>
              <Text style={styles.insightIcon}>💼</Text>
              <Text style={styles.insightTxt}>
                Ahorraste en promedio {money(Math.max(0, Math.round((pico.monto || r.ingresos) - avg)))} al mes.
              </Text>
            </View>
          </View>
        </>
      )}
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center" },
  tabOn: { backgroundColor: colors.soft },
  tabTxt: { color: colors.muted, fontWeight: "700" },
  tabTxtOn: { color: colors.ink },
  donutCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
  },
  wallet: { fontSize: 18 },
  donutAmt: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  negativeAmount: { color: colors.danger },
  donutSub: { color: colors.muted, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  empty: { color: colors.muted, width: "100%", textAlign: "center", padding: 12 },
  catCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 14,
    gap: 8,
  },
  catTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: { color: colors.ink, fontWeight: "800" },
  catCount: { color: colors.muted, fontSize: 11 },
  catAmt: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  catFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  catDelta: { color: colors.mint, fontSize: 11, fontWeight: "700" },
  pctWrap: {
    flex: 1,
    height: 6,
    backgroundColor: colors.soft,
    borderRadius: 4,
    overflow: "hidden",
  },
  pctBar: { height: 6, borderRadius: 4 },
  pctTxt: { color: colors.pink, fontSize: 11, fontWeight: "800" },
  monthCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 16,
    gap: 12,
    overflow: "hidden",
  },
  monthHead: { flexDirection: "row", justifyContent: "space-between" },
  heroLabel: { color: colors.muted, fontWeight: "700" },
  big: { color: colors.ink, fontSize: 32, fontWeight: "800", marginTop: 4 },
  change: { marginTop: 4, fontWeight: "700", fontSize: 12 },
  up: { color: colors.mint },
  down: { color: colors.danger },
  more: { color: colors.muted, fontSize: 20 },
  legend: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  legI: { color: colors.blue, fontSize: 11, fontWeight: "700" },
  legE: { color: colors.danger, fontSize: 11, fontWeight: "700" },
  ranges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  range: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.soft,
  },
  rangeOn: { backgroundColor: colors.ink },
  rangeTxt: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  rangeTxtOn: { color: colors.bg },
  insights: { flexDirection: "row", gap: 10 },
  insight: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 14,
    gap: 8,
  },
  insightIcon: { fontSize: 16 },
  insightTxt: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "600" },
});
