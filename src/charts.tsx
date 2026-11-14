import { colors } from "./theme";
import type { ReactNode } from "react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Slice = { color: string; value: number };

export function DonutChart({
  slices,
  size = 210,
  children,
}: {
  slices: Slice[];
  size?: number;
  children?: ReactNode;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const ticks = 48;
  const usable = slices.filter((slice) => slice.value > 0);
  let cursor = 0;
  const colored: string[] = Array.from({ length: ticks }, () => colors.border);
  if (total > 0 && usable.length > 0) {
    for (const slice of usable) {
      const span = Math.max(1, Math.round((slice.value / total) * ticks));
      const gap = 2;
      for (let i = 0; i < span; i += 1) {
        const idx = (cursor + i) % ticks;
        colored[idx] = i < span - gap ? slice.color : colors.bgElevated;
      }
      cursor += span;
    }
  }

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {colored.map((color, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: size / 2 - 7,
            left: size / 2 - 1.5,
            width: 3,
            height: 12,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ rotate: `${(360 / ticks) * i}deg` }, { translateY: -size / 2 + 10 }],
          }}
        />
      ))}
      <View
        style={[
          styles.donutHole,
          {
            width: size - 52,
            height: size - 52,
            borderRadius: (size - 52) / 2,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function LineChart({
  values,
  labels,
  height = 160,
}: {
  values: number[];
  labels: string[];
  height?: number;
}) {
  const [width, setWidth] = useState(300);
  const step = 50000;
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const minTick = Math.floor(minValue / step) * step;
  let maxTick = Math.ceil(maxValue / step) * step;
  if (maxTick === minTick) maxTick = minTick + step;
  const tickValues: number[] = [];
  for (let value = minTick; value <= maxTick; value += step) {
    tickValues.push(value);
  }

  const chartHeight = Math.max(height, (tickValues.length - 1) * 26 + 36);
  const padTop = 12;
  const padBottom = 26;
  const plotHeight = chartHeight - padTop - padBottom;
  const plotWidth = Math.max(0, width - 12);
  const points = values.map((value, i) => ({
    x:
      6 +
      (values.length === 1
        ? plotWidth / 2
        : (i / Math.max(values.length - 1, 1)) * plotWidth),
    y: padTop + ((maxTick - value) / (maxTick - minTick)) * plotHeight,
    value,
  }));

  return (
    <View style={[styles.chartLayout, { height: chartHeight }]}>
      <View style={[styles.yAxis, { height: chartHeight }]}>
        {tickValues.map((value) => {
          const y = padTop + ((maxTick - value) / (maxTick - minTick)) * plotHeight;
          return (
            <Text key={value} style={[styles.yLabel, { top: y - 8 }]}>
              {value === 0 ? "0" : `${value < 0 ? "−" : ""}${Math.abs(value) / 1000}k`}
            </Text>
          );
        })}
      </View>
      <View
        style={{ height: chartHeight, flex: 1 }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {tickValues.map((value) => {
          const y = padTop + ((maxTick - value) / (maxTick - minTick)) * plotHeight;
          return (
            <View
              key={value}
              style={[
                styles.grid,
                { top: y, backgroundColor: value === 0 ? colors.muted : colors.border },
              ]}
            />
          );
        })}
        {points.slice(0, -1).map((from, i) => (
          <Polyline
            key={i}
            pts={[from, points[i + 1]]}
            color={from.value < 0 || points[i + 1].value < 0 ? colors.danger : colors.blue}
          />
        ))}
        {points.map((point, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                left: point.x - 4,
                top: point.y - 4,
                backgroundColor: point.value < 0 ? colors.danger : colors.blue,
              },
            ]}
          />
        ))}
        <View style={styles.labels}>
          {labels.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.label}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function Polyline({
  pts,
  color,
}: {
  pts: { x: number; y: number; value: number }[];
  color: string;
}) {
  return (
    <>
      {pts.slice(0, -1).map((from, i) => {
        const to = pts[i + 1];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: (from.x + to.x) / 2 - len / 2,
              top: (from.y + to.y) / 2 - 1.5,
              width: len,
              height: 3,
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  donutHole: {
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  grid: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.bgElevated,
  },
  labels: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLayout: { width: "100%", flexDirection: "row" },
  yAxis: { width: 48, position: "relative" },
  yLabel: {
    position: "absolute",
    left: 0,
    width: 44,
    textAlign: "right",
    color: colors.muted,
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  label: { color: colors.muted, fontSize: 11, textTransform: "capitalize" },
});
