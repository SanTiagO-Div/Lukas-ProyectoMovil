import * as LocalAuthentication from "expo-local-authentication";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../src/theme";
import { useLukas } from "../src/store";

export default function Login() {
  const {
    loginUser,
    loginWithBiometric,
    requestPasswordReset,
    isAuthenticated,
    ready,
    users,
    touchSession,
    biometricUnlockRequired,
  } = useLukas();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [slowVerification, setSlowVerification] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const biometricEmailPrefillDone = useRef(false);
  const biometricUnlockAttempted = useRef(false);
  const biometricUsers = users.filter((user) => user.biometricEnabled);

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/");
    }
  }, [ready, isAuthenticated]);

  useEffect(() => {
    if (!ready || biometricEmailPrefillDone.current) return;
    biometricEmailPrefillDone.current = true;
    if (biometricUsers.length === 1) {
      setEmail(biometricUsers[0].email);
    }
  }, [ready, biometricUsers]);

  const handleLogin = async () => {
    if (submitting) return;
    if (!email.trim() || !password) {
      setLoginError("Escribe tu correo y contraseña.");
      return;
    }

    setSubmitting(true);
    setLoginError("");
    setSlowVerification(false);
    const slowTimer = setTimeout(() => setSlowVerification(true), 2000);
    try {
      const result = await loginUser(email, password);
      if (!result.ok) {
        setLoginError(result.message ?? "No se pudo iniciar sesión.");
        return;
      }

      touchSession();
      router.replace("/");
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión. Inténtalo de nuevo."
      );
    } finally {
      clearTimeout(slowTimer);
      setSubmitting(false);
      setSlowVerification(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (biometricBusy) return;
    if (Platform.OS === "web") {
      Alert.alert("No disponible", "La autenticación biométrica no está disponible en web.");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Correo requerido", "Escribe el correo de la cuenta que tiene huella activada.");
      return;
    }

    setBiometricBusy(true);
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!supported || !enrolled) {
        Alert.alert(
          "Huella no disponible",
          "Tu dispositivo no tiene biometría compatible configurada."
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Inicia sesión con tu huella",
        fallbackLabel: "Usar contraseña",
        cancelLabel: "Cancelar",
      });
      if (!result.success) return;

      const login = await loginWithBiometric(email);
      if (!login.ok) {
        Alert.alert("No se pudo iniciar sesión", login.message ?? "Inténtalo con tu contraseña.");
        return;
      }
      touchSession();
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "No se pudo iniciar con huella",
        error instanceof Error ? error.message : "Inténtalo con tu contraseña."
      );
    } finally {
      setBiometricBusy(false);
    }
  };

  useEffect(() => {
    if (
      !ready ||
      !biometricUnlockRequired ||
      biometricUnlockAttempted.current
    ) {
      return;
    }
    if (!email.trim() && biometricUsers.length === 1) {
      setEmail(biometricUsers[0].email);
      return;
    }
    if (!email.trim()) return;

    biometricUnlockAttempted.current = true;
    void handleBiometricLogin();
  }, [ready, biometricUnlockRequired, email, biometricUsers.length]);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.subtitle}>Accede a tus finanzas con seguridad.</Text>

        <TextInput
          accessibilityLabel="Correo electrónico"
          placeholder="correo@ejemplo.com"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setLoginError("");
            setRecoveryMessage("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <View style={styles.passwordWrap}>
          <TextInput
            accessibilityLabel="Contraseña"
            placeholder="Contraseña"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showPassword}
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setLoginError("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
          />
          <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
            <Text style={styles.eyeText}>{showPassword ? "Ocultar" : "Ver"}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={recovering || submitting}
          onPress={() => {
            if (recovering || submitting) return;
            setLoginError("");
            setRecoveryMessage("");
            setRecovering(true);
            void requestPasswordReset(email)
              .then((result) => {
                setRecoveryMessage(
                  result.ok
                    ? result.message ?? "Revisa tu correo para continuar."
                    : result.message ?? "No se pudo solicitar el cambio de contraseña."
                );
              })
              .catch((error: unknown) => {
                setRecoveryMessage(
                  error instanceof Error
                    ? error.message
                    : "No se pudo solicitar el cambio de contraseña."
                );
              })
              .finally(() => setRecovering(false));
          }}
          style={styles.recoveryLink}
        >
          <Text style={styles.linkText}>
            {recovering ? "Enviando instrucciones..." : "¿Olvidaste tu contraseña?"}
          </Text>
        </Pressable>
        {recoveryMessage ? (
          <Text accessibilityRole="alert" style={styles.progressText}>
            {recoveryMessage}
          </Text>
        ) : null}

        {loginError ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {loginError}
          </Text>
        ) : null}
        {submitting ? (
          <Text accessibilityLiveRegion="polite" style={styles.progressText}>
            {slowVerification
              ? "La conexión está tardando más de lo habitual. Espera un momento…"
              : "Validando correo y contraseña…"}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting || biometricBusy}
          style={[styles.primaryButton, (submitting || biometricBusy) && styles.buttonDisabled]}
          onPress={handleLogin}
        >
          {submitting ? (
            <ActivityIndicator color={colors.yellowInk} />
          ) : (
            <Text style={styles.primaryButtonText}>Ingresar</Text>
          )}
        </Pressable>

        {biometricUsers.length > 0 && (
          <Pressable
            accessibilityRole="button"
            disabled={submitting || biometricBusy}
            style={[styles.secondaryButton, (submitting || biometricBusy) && styles.buttonDisabled]}
            onPress={handleBiometricLogin}
          >
            {biometricBusy ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.secondaryButtonText}>Iniciar sesión con huella</Text>
            )}
          </Pressable>
        )}

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>¿No tienes cuenta?</Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.linkText}>Crear cuenta</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: -6,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 15,
  },
  passwordWrap: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 72,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.soft,
  },
  eyeText: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: colors.yellow,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.yellowInk,
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    color: colors.muted,
  },
  linkText: {
    color: colors.yellow,
    fontWeight: "700",
  },
  recoveryLink: { alignSelf: "flex-end", paddingVertical: 2 },
});
