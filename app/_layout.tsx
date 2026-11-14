import { StoreProvider, useLukas } from "../src/store";
import { colors } from "../src/theme";
import { BottomNav } from "../src/ui";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";

const RESET_PASSWORD_ROUTE = "/auth/reset-password";
const AUTHENTICATION_ROUTES = new Set([
  "/login",
  "/register",
  RESET_PASSWORD_ROUTE,
]);

function isAuthenticationRoute(pathname: string) {
  return AUTHENTICATION_ROUTES.has(pathname);
}

function getRecoveryRoute(
  url: string
): typeof RESET_PASSWORD_ROUTE | `${typeof RESET_PASSWORD_ROUTE}?${string}` | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!parsed.pathname.includes(RESET_PASSWORD_ROUTE)) return null;

  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.replace(/^#/, "")).forEach((value, key) => {
    params.set(key, value);
  });

  const query = params.toString();
  return query ? `${RESET_PASSWORD_ROUTE}?${query}` : RESET_PASSWORD_ROUTE;
}

export default function Layout() {
  return (
    <StoreProvider>
      <AppNavigation />
    </StoreProvider>
  );
}

function AppNavigation() {
  const { ready, isAuthenticated, touchSession } = useLukas();
  const pathname = usePathname();
  const lastRecoveryUrl = useRef("");

  useEffect(() => {
    const routeRecoveryLink = (url: string) => {
      if (lastRecoveryUrl.current === url) return;
      const recoveryRoute = getRecoveryRoute(url);
      if (!recoveryRoute) return;
      lastRecoveryUrl.current = url;
      router.replace(recoveryRoute);
    };

    const subscription = Linking.addEventListener("url", ({ url }) => {
      routeRecoveryLink(url);
    });
    void Linking.getInitialURL()
      .then((url) => {
        if (url) routeRecoveryLink(url);
      })
      .catch((error: unknown) => {
        console.error("No se pudo leer el enlace de recuperación:", error);
      });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (isAuthenticated) {
      if (pathname === "/login") {
        router.replace("/");
      }
      return;
    }

    if (!isAuthenticationRoute(pathname)) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, pathname]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.yellow} />
        <Text style={styles.loadingText}>Cargando tus finanzas...</Text>
      </View>
    );
  }

  if (!isAuthenticated && !isAuthenticationRoute(pathname)) {
    return null;
  }

  return (
    <View style={styles.shell} onTouchStart={touchSession}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
          animationDuration: 150,
          freezeOnBlur: true,
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="auth/reset-password" />
        <Stack.Screen name="index" />
        <Stack.Screen name="presupuesto" />
        <Stack.Screen name="metas" />
        <Stack.Screen name="gastos-categoria" />
        <Stack.Screen name="deudas" />
        <Stack.Screen name="pagar" />
        <Stack.Screen name="cobrar" />
        <Stack.Screen name="informes" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="ajustes" />
      </Stack>
      {isAuthenticated && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.bg,
    padding: 24,
  },
  loadingText: { color: colors.muted, fontSize: 15, fontWeight: "600" },
});
