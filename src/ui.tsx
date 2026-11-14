import { colors } from "./theme";
import { Link, router, usePathname, type Href } from "expo-router";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLukas } from "./store";
import { formatearMontoEntrada } from "./finance";

export function confirmDestructiveAction(
  title: string,
  message: string,
  onConfirm: () => void
) {
  if (Platform.OS === "web") {
    if (typeof globalThis.confirm === "function" && globalThis.confirm(message)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: "Eliminar", style: "destructive", onPress: onConfirm },
  ]);
}

type AmountInputProps = Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (value: string) => void;
  allowNegative?: boolean;
};

export function AmountInput({
  value,
  onChangeText,
  allowNegative = false,
  ...props
}: AmountInputProps) {
  return (
    <TextInput
      {...props}
      value={value}
      onChangeText={(nextValue) =>
        onChangeText(formatearMontoEntrada(nextValue, allowNegative))
      }
    />
  );
}

export function CircleButton({
  label,
  onPress,
  tone = "dark",
}: {
  label: string;
  onPress?: () => void;
  tone?: "dark" | "yellow";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.circle, tone === "yellow" && styles.circleYellow]}
    >
      <Text style={[styles.circleTxt, tone === "yellow" && styles.circleTxtYellow]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AppHeader({
  title,
  subtitle,
  onSearch,
  onBell,
  showBack,
}: {
  title: string;
  subtitle?: string;
  onSearch?: () => void;
  onBell?: () => void;
  showBack?: boolean;
}) {
  const { logoutUser } = useLukas();
  const pathname = usePathname();

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.circle}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace(
                pathname === "/metas" || pathname === "/gastos-categoria"
                  ? "/presupuesto"
                  : pathname === "/pagar" || pathname === "/cobrar"
                    ? "/deudas"
                    : "/"
              );
            }}
          >
            <Text style={styles.circleTxt}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>L</Text>
          </View>
        )}
        <View style={showBack ? styles.titleBlock : undefined}>
          <Text style={showBack ? styles.headerTitleCenter : styles.hello}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.headerRight}>
        {onSearch && <CircleButton label="⌕" onPress={onSearch} />}
        {onBell && <CircleButton label="◔" onPress={onBell} />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          onPress={() => {
            logoutUser();
            router.replace("/login");
          }}
          style={styles.logoutButton}
        >
          <View style={styles.exitIcon} accessible={false}>
            <View style={styles.exitDoorFrame} />
            <View style={styles.exitDoor} />
            <Text style={styles.exitArrow}>→</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  type NavIconName = "add" | "home" | "stats" | "budget" | "debts" | "settings";
  const item = (
    href: Href,
    icon: NavIconName,
    active: boolean,
    label: string,
    accent?: boolean
  ) => (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={StyleSheet.flatten([
          styles.navItem,
          active && !accent && styles.navItemOn,
          accent && styles.navPlus,
        ])}
      >
        {renderNavIcon(icon, accent ? colors.yellowInk : active ? colors.bg : colors.muted)}
      </Pressable>
    </Link>
  );

  return (
    <View style={[styles.navWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.navBar}>
        {item("/explore", "add", pathname.startsWith("/explore"), "Agregar movimiento", true)}
        {item("/", "home", pathname === "/" || pathname === "/index", "Inicio")}
        {item("/informes", "stats", pathname.startsWith("/informes"), "Estadísticas")}
        {item("/presupuesto", "budget", pathname.startsWith("/presupuesto"), "Presupuesto")}
        {item("/deudas", "debts", pathname.startsWith("/deudas"), "Por pagar y cobrar")}
        {item("/ajustes", "settings", pathname.startsWith("/ajustes"), "Ajustes")}
      </View>
    </View>
  );
}

function renderNavIcon(icon: "add" | "home" | "stats" | "budget" | "debts" | "settings", color: string) {
  if (icon === "stats") {
    return (
      <View style={styles.chartIcon}>
        <View style={[styles.chartBar, styles.chartBarSmall, { backgroundColor: color }]} />
        <View style={[styles.chartBar, styles.chartBarMedium, { backgroundColor: color }]} />
        <View style={[styles.chartBar, styles.chartBarLarge, { backgroundColor: color }]} />
      </View>
    );
  }
  if (icon === "budget") {
    return (
      <View style={[styles.walletIcon, { borderColor: color }]}>
        <View style={[styles.walletLine, { backgroundColor: color }]} />
        <View style={[styles.walletPocket, { borderColor: color }]}>
          <View style={[styles.walletDot, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  const glyph = {
    add: "+",
    home: "⌂",
    debts: "⇄",
    settings: "⚙",
  }[icon];
  return (
    <Text
      style={[
        styles.navIcon,
        { color },
        icon === "add" && styles.navPlusTxt,
        icon === "home" && styles.homeIcon,
        icon === "settings" && styles.settingsIcon,
      ]}
    >
      {glyph}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  hello: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  titleBlock: { flex: 1, alignItems: "center", marginRight: 40 },
  headerTitleCenter: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#C9A38A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#3B2418", fontWeight: "800" },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  circleYellow: { backgroundColor: colors.yellow },
  circleTxt: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  circleTxtYellow: { color: colors.yellowInk, fontSize: 22 },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  exitIcon: { width: 27, height: 26, position: "relative" },
  exitDoorFrame: {
    position: "absolute",
    left: 2,
    top: 3,
    width: 14,
    height: 20,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.danger,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  exitDoor: {
    position: "absolute",
    left: 7,
    top: 6,
    width: 8,
    height: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 1,
  },
  exitArrow: {
    position: "absolute",
    right: -1,
    top: 1,
    color: colors.danger,
    fontSize: 17,
    fontWeight: "800",
  },
  navWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgElevated,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    width: "92%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navItem: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  navItemOn: { backgroundColor: colors.ink },
  navPlus: { backgroundColor: colors.yellow },
  navIcon: { fontSize: 22, fontWeight: "700" },
  navPlusTxt: { fontSize: 28, marginTop: -2 },
  homeIcon: { fontSize: 24 },
  settingsIcon: { fontSize: 23 },
  chartIcon: {
    height: 22,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  chartBar: { width: 5, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  chartBarSmall: { height: 8 },
  chartBarMedium: { height: 14 },
  chartBarLarge: { height: 20 },
  walletIcon: {
    width: 24,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    position: "relative",
  },
  walletLine: { height: 2, width: 16, position: "absolute", left: 0, top: 4 },
  walletPocket: {
    width: 10,
    height: 8,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    position: "absolute",
    right: 0,
    top: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  walletDot: { width: 2, height: 2, borderRadius: 1 },
});
