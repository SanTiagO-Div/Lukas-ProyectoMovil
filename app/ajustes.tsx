import * as LocalAuthentication from "expo-local-authentication";
import { ResponsivePage } from "../src/ResponsivePage";
import { useLukas } from "../src/store";
import { colors } from "../src/theme";
import { AppHeader } from "../src/ui";
import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

export default function Ajustes() {
  const { biometricEnabled, toggleBiometric, currentUser } = useLukas();
  const [busy, setBusy] = useState(false);

  const cambiarHuella = async () => {
    if (busy) return;
    if (biometricEnabled) {
      toggleBiometric();
      Alert.alert("Huella desactivada", "El próximo inicio será con correo y contraseña.");
      return;
    }

    if (Platform.OS === "web") {
      Alert.alert("No disponible", "El inicio biométrico solo está disponible en la app móvil.");
      return;
    }

    setBusy(true);
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!supported || !enrolled) {
        Alert.alert(
          "Huella no disponible",
          "Configura la huella o biometría del dispositivo antes de activarla."
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirma tu identidad para activar el inicio con huella",
        fallbackLabel: "Cancelar",
        cancelLabel: "Cancelar",
      });
      if (!result.success) return;

      toggleBiometric();
      Alert.alert(
        "Inicio con huella activado",
        "La próxima vez podrás elegir «Iniciar sesión con huella» en la pantalla de acceso."
      );
    } catch (error) {
      Alert.alert(
        "No se pudo activar la huella",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ResponsivePage contentContainerStyle={styles.wrap}>
      <AppHeader title="Ajustes" subtitle="Seguridad de tu cuenta" showBack />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos personales y cuenta</Text>
        <View style={styles.detail}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>{currentUser?.nombre || "No disponible"}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.label}>Apellidos</Text>
          <Text style={styles.value}>{currentUser?.apellidos || "No disponibles"}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <Text style={styles.value}>{currentUser?.fechaNacimiento || "No disponible"}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.label}>Correo de la cuenta</Text>
          <Text style={styles.value}>{currentUser?.email || "No disponible"}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        <Text style={styles.title}>Inicio con huella</Text>
        <Text style={styles.description}>
          {biometricEnabled
            ? "La biometría está activada. Puedes usarla para iniciar sesión de forma rápida y segura."
            : "Usa la huella o el reconocimiento biométrico de tu dispositivo para iniciar sesión."}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={cambiarHuella}
        >
          <Text style={styles.buttonText}>
            {biometricEnabled ? "Desactivar inicio con huella" : "Activar inicio con huella"}
          </Text>
        </Pressable>
      </View>
    </ResponsivePage>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 14,
    alignItems: "flex-start",
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 24 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginBottom: 2 },
  detail: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  value: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  title: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  button: {
    alignSelf: "stretch",
    minHeight: 48,
    backgroundColor: colors.yellow,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.yellowInk, fontWeight: "800", textAlign: "center" },
});
