import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../src/supabase";
import { colors } from "../../src/theme";

const LINK_VALIDATION_TIMEOUT_MS = 20000;

async function withTimeout<T>(promise: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("La validación está tardando demasiado. Comprueba tu conexión y solicita un enlace nuevo.")),
          LINK_VALIDATION_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function getCallbackParams(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.replace(/^#/, "")).forEach((value, key) => {
    params.set(key, value);
  });
  return params;
}

function getRouteParams(
  routeParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(routeParams)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value !== undefined) params.set(key, value);
  }
  return params;
}

export default function ResetPassword() {
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const routeParamsKey = JSON.stringify(routeParams);
  const handled = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  useEffect(() => {
    let active = true;
    let waitingTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleCallback = async (params: URLSearchParams) => {
      if (handled.current) return;
      handled.current = true;
      if (waitingTimeout) clearTimeout(waitingTimeout);
      try {
        if (!supabase) throw new Error("No está configurada la conexión con Supabase.");

        const session = await withTimeout((async () => {
          const authError = params.get("error_description") ?? params.get("error");
          if (authError) throw new Error(authError.replace(/\+/g, " "));

          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            return data.session;
          } else {
            const code = params.get("code");
            if (code) {
              const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) throw exchangeError;
              return data.session;
            }

            const tokenHash = params.get("token_hash");
            const type = params.get("type");
            if (tokenHash && type === "recovery") {
              const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: "recovery",
              });
              if (verifyError) throw verifyError;
              return data.session;
            }
            throw new Error("El enlace no es válido o venció. Solicita recuperar la contraseña otra vez.");
          }
        })());

        if (!session?.user) throw new Error("Supabase no devolvió una sesión válida para cambiar la contraseña.");
        if (active) {
          setError("");
          setReady(true);
        }
      } catch (caught) {
        handled.current = false;
        if (active) {
          setReady(false);
          setError(caught instanceof Error ? caught.message : "No se pudo validar el enlace.");
        }
      }
      if (active) setValidating(false);
    };

    const handleUrl = (url: string) => handleCallback(getCallbackParams(url));
    const routeCallbackParams = getRouteParams(routeParams);
    const hasRouteCallbackParams =
      routeCallbackParams.has("code") ||
      routeCallbackParams.has("access_token") ||
      routeCallbackParams.has("token_hash") ||
      routeCallbackParams.has("error");
    if (
      hasRouteCallbackParams
    ) {
      void handleCallback(routeCallbackParams);
    }

    waitingTimeout = setTimeout(() => {
      if (active && !handled.current) {
        setValidating(false);
        setError("No llegó la información de recuperación a la app. Solicita un enlace nuevo y ábrelo directamente desde el teléfono.");
      }
    }, LINK_VALIDATION_TIMEOUT_MS);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });
    void Linking.getInitialURL()
      .then((url) => {
        if (url) return handleUrl(url);
        if (active && !hasRouteCallbackParams && !handled.current) {
          setError("Abre desde tu teléfono el enlace de recuperación que llegó a tu correo.");
          setValidating(false);
        }
      })
      .catch((caught: unknown) => {
        if (active && !handled.current) {
          setError(caught instanceof Error ? caught.message : "No se pudo abrir el enlace.");
          setValidating(false);
        }
      });

    return () => {
      active = false;
      if (waitingTimeout) clearTimeout(waitingTimeout);
      subscription.remove();
    };
  }, [routeParamsKey]);

  const handlePasswordUpdate = async () => {
    if (loading) return;
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!supabase) {
      setError("No está configurada la conexión con Supabase.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await withTimeout(
        supabase.auth.updateUser({ password })
      );
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (supabase) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(`La contraseña se cambió, pero no se pudo cerrar esta sesión: ${signOutError.message}`);
        return;
      }
    }
    router.replace("/login");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{success ? "Contraseña actualizada" : "Recuperar contraseña"}</Text>
        {success ? (
          <>
            <Text style={styles.description}>Tu contraseña se cambió correctamente. Inicia sesión con la nueva contraseña.</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.primaryButton} onPress={() => void finish()}>
              <Text style={styles.primaryButtonText}>Ir a iniciar sesión</Text>
            </Pressable>
          </>
        ) : !ready ? (
          <>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            ) : (
              <>
                <ActivityIndicator color={colors.yellow} />
                <Text style={styles.description}>
                  {validating ? "Validando el enlace de recuperación..." : "Esperando el enlace del correo..."}
                </Text>
              </>
            )}
            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.link}>Volver al inicio de sesión</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.description}>Escribe una contraseña nueva para tu cuenta.</Text>
            <TextInput
              accessibilityLabel="Nueva contraseña"
              placeholder="Nueva contraseña"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setError("");
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              accessibilityLabel="Confirmar nueva contraseña"
              placeholder="Repite la nueva contraseña"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={passwordConfirmation}
              onChangeText={(value) => {
                setPasswordConfirmation(value);
                setError("");
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={() => void handlePasswordUpdate()}
            >
              {loading ? <ActivityIndicator color={colors.yellowInk} /> : <Text style={styles.primaryButtonText}>Guardar contraseña</Text>}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: colors.bg },
  card: { width: "100%", maxWidth: 420, padding: 22, gap: 14, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.ink, fontSize: 25, fontWeight: "800" },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  input: { backgroundColor: colors.bgElevated, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 14, color: colors.ink, fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: colors.yellowInk, fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.65 },
  link: { color: colors.yellow, fontWeight: "700", textAlign: "center", paddingVertical: 8 },
});
