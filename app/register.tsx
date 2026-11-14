import DateTimePicker from "@react-native-community/datetimepicker";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../src/theme";
import { useLukas } from "../src/store";

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function datePickerValue(value: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export default function Register() {
  const { registerUser, isAuthenticated } = useLukas();
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registerStatus, setRegisterStatus] = useState("");

  useEffect(() => {
    if (isAuthenticated && !registered && !submitting) router.replace("/");
  }, [isAuthenticated, registered, submitting]);

  const handleRegister = async () => {
    if (submitting) return;

    setSubmitting(true);
    setRegisterError("");
    setRegistered(false);
    setRegisterStatus("Validando tus datos...");
    try {
      const result = await registerUser(
        {
          nombre,
          apellidos,
          fechaNacimiento,
          email,
          password,
        },
        setRegisterStatus
      );

      if (!result.ok) {
        setRegisterError(result.message ?? "Inténtalo de nuevo.");
        return;
      }

      setRegistered(true);
    } catch (error) {
      setRegisterError(
        error instanceof Error ? error.message : "No se pudo crear la cuenta. Inténtalo de nuevo."
      );
    } finally {
      setSubmitting(false);
      setRegisterStatus("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.card}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Registra tus datos para empezar a controlar tus finanzas.</Text>

        {registered ? (
          <View style={styles.confirmationBox}>
            <Text style={styles.confirmationTitle}>Cuenta creada correctamente</Text>
            <Text style={styles.confirmationText}>
              Tu cuenta está lista. Ya puedes empezar a usar Lukas.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.primaryButtonText}>Continuar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.formFields}>

        <TextInput
          accessibilityLabel="Nombres"
          placeholder="Nombres"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={nombre}
          onChangeText={(value) => {
            setNombre(value);
            setRegisterError("");
          }}
        />

        <TextInput
          accessibilityLabel="Apellidos"
          placeholder="Apellidos"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={apellidos}
          onChangeText={(value) => {
            setApellidos(value);
            setRegisterError("");
          }}
        />

        <Pressable onPress={() => setShowDatePicker(true)}>
          <TextInput
            accessibilityLabel="Fecha de nacimiento"
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={fechaNacimiento}
            editable={false}
            pointerEvents="none"
          />
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={datePickerValue(fechaNacimiento)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onValueChange={(_, selectedDate) => {
              setFechaNacimiento(formatDate(selectedDate));
              setRegisterError("");
              if (Platform.OS === "android") setShowDatePicker(false);
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}
        {showDatePicker && Platform.OS === "ios" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowDatePicker(false)}
            style={styles.dateDoneButton}
          >
            <Text style={styles.dateDoneText}>Listo con esta fecha</Text>
          </Pressable>
        ) : null}

        <TextInput
          accessibilityLabel="Correo electrónico"
          placeholder="correo@ejemplo.com"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setRegisterError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
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
              setRegisterError("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
            <Text style={styles.eyeText}>{showPassword ? "Ocultar" : "Ver"}</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>Debes ser mayor de 18 años para usar la aplicación.</Text>

        {registerError ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {registerError}
          </Text>
        ) : null}
        {submitting ? (
          <Text accessibilityLiveRegion="polite" style={styles.statusText}>
            {registerStatus}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={() => void handleRegister()}
        >
          {submitting ? (
            <ActivityIndicator color={colors.yellowInk} />
          ) : (
            <Text style={styles.primaryButtonText}>Crear cuenta</Text>
          )}
        </Pressable>
          </View>
        )}

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.linkText}>Iniciar sesión</Text>
            </Pressable>
          </Link>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
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
    gap: 12,
  },
  formFields: { gap: 12 },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 6,
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
  note: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  dateDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.soft,
  },
  dateDoneText: { color: colors.yellow, fontWeight: "700", fontSize: 13 },
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
  buttonDisabled: {
    opacity: 0.65,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  confirmationBox: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.mint,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  confirmationTitle: { color: colors.mint, fontWeight: "800", fontSize: 16 },
  confirmationText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  statusText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  footerText: {
    color: colors.muted,
  },
  linkText: {
    color: colors.yellow,
    fontWeight: "700",
  },
});
