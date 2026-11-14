import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState as NativeAppState } from "react-native";
import * as Linking from "expo-linking";
import { validateRegistration } from "./registration";
import { readFinancialState, writeFinancialState } from "./financialRepository";
import { requireSupabase, supabase } from "./supabase";
import type { AppState, AuthSession, AuthUser, Cuota, Meta, Movimiento, Presupuesto } from "./types";
import {
  claveMes,
  eliminarMovimiento as quitarDelEstado,
} from "./finance";
import { isAppState, normalizeAppState } from "./stateValidation";

const KEY = "lukas-state-v1";
const AUTH_KEY = "lukas-auth-v1";
const LEGACY_MIGRATION_KEY = "lukas-state-migrated-to-supabase-v1";
const AUTH_REQUEST_TIMEOUT_MS = 20000;
export const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

async function withAuthRequestTimeout<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("La solicitud tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.")),
          AUTH_REQUEST_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const seed: AppState = {
  cuenta: "",
  saldoInicial: 0,
  mesSaldoInicial: claveMes(),
  movimientos: [],
  cuotas: [],
  metas: [],
  presupuestos: [],
};

const authSeed: AuthSession = {
  users: [],
  currentUserId: null,
  isAuthenticated: false,
  lastActivity: null,
  biometricEnabled: false,
  biometricUnlockRequired: false,
};

function userStateKey(userId: string) {
  return `${KEY}:${userId}`;
}

function userStateDirtyKey(userId: string) {
  return `${userStateKey(userId)}:pending-sync`;
}

async function loadOrMigrateUserState(
  userId: string,
  legacyState: AppState
): Promise<AppState> {
  const remoteState = await readFinancialState(userId);
  const hasPendingChanges =
    (await AsyncStorage.getItem(userStateDirtyKey(userId))) === "true";
  if (remoteState !== null && !hasPendingChanges) {
    if (!isAppState(remoteState)) {
      throw new Error("Los datos financieros guardados en Supabase tienen un formato inválido.");
    }
    const normalized = normalizeAppState(remoteState);
    await AsyncStorage.setItem(userStateKey(userId), JSON.stringify(normalized));
    await AsyncStorage.setItem(LEGACY_MIGRATION_KEY, "true");
    return normalized;
  }

  const userRaw = await AsyncStorage.getItem(userStateKey(userId));
  let stateToMigrate: AppState;
  if (userRaw) {
    const parsed: unknown = JSON.parse(userRaw);
    if (!isAppState(parsed)) {
      throw new Error("La copia local de tus datos financieros no tiene un formato válido.");
    }
    stateToMigrate = normalizeAppState(parsed);
  } else if ((await AsyncStorage.getItem(LEGACY_MIGRATION_KEY)) !== "true") {
    stateToMigrate = legacyState;
  } else {
    stateToMigrate = seed;
  }

  await writeFinancialState(userId, stateToMigrate);
  await AsyncStorage.setItem(userStateKey(userId), JSON.stringify(stateToMigrate));
  await AsyncStorage.removeItem(userStateDirtyKey(userId));
  await AsyncStorage.setItem(LEGACY_MIGRATION_KEY, "true");
  return stateToMigrate;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthSession>;
  return (
    Array.isArray(candidate.users) &&
    candidate.users.every((user) => {
      if (!user || typeof user.id !== "string") return false;
      if (typeof user.nombre !== "string" || typeof user.apellidos !== "string") return false;
      if (typeof user.fechaNacimiento !== "string" || typeof user.email !== "string") return false;
      if (typeof user.biometricEnabled !== "boolean") return false;
      return true;
    }) &&
    (candidate.currentUserId === null || typeof candidate.currentUserId === "string") &&
    typeof candidate.isAuthenticated === "boolean" &&
    (candidate.lastActivity === null || typeof candidate.lastActivity === "number") &&
    typeof candidate.biometricEnabled === "boolean" &&
    (candidate.biometricUnlockRequired === undefined ||
      typeof candidate.biometricUnlockRequired === "boolean")
  );
}

function nuevoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function profileFromSupabaseUser(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  biometricEnabled = false
): AuthUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    nombre: typeof metadata.nombre === "string" ? metadata.nombre : "",
    apellidos: typeof metadata.apellidos === "string" ? metadata.apellidos : "",
    fechaNacimiento:
      typeof metadata.fecha_nacimiento === "string" ? metadata.fecha_nacimiento : "",
    email: user.email ?? "",
    biometricEnabled,
  };
}

function authenticatedSession(
  user: AuthUser,
  currentUserId = user.id
): AuthSession {
  return {
    users: [user],
    currentUserId,
    isAuthenticated: true,
    lastActivity: Date.now(),
    biometricEnabled: user.biometricEnabled,
    biometricUnlockRequired: false,
  };
}

function emailAuthErrorMessage(message: string) {
  if (/already registered|already exists/i.test(message)) {
    return "Ya existe una cuenta con ese correo. Intenta iniciar sesión.";
  }
  return message;
}

async function loadSupabaseUser() {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

type Ctx = AppState & {
  ready: boolean;
  users: AuthUser[];
  currentUser: AuthUser | null;
  currentUserId: string | null;
  isAuthenticated: boolean;
  lastActivity: number | null;
  biometricEnabled: boolean;
  biometricUnlockRequired: boolean;
  establecerSaldoInicial: (monto: number) => void;
  agregarMovimiento: (m: Omit<Movimiento, "id" | "fecha">) => void;
  actualizarMovimiento: (
    id: string,
    changes: Pick<Movimiento, "monto" | "categoria" | "detalleCategoria">
  ) => void;
  eliminarMovimiento: (id: string) => void;
  agregarCuota: (c: Omit<Cuota, "id">) => void;
  alternarCuota: (id: string) => void;
  aportarMeta: (id: string, monto: number) => void;
  agregarMeta: (m: Omit<Meta, "id" | "aportado">) => void;
  guardarPresupuesto: (presupuesto: Omit<Presupuesto, "id">) => void;
  borrarPresupuesto: (id: string) => void;
  registerUser: (payload: {
    nombre: string;
    apellidos: string;
    fechaNacimiento: string;
    email: string;
    password: string;
  }, onProgress?: (status: string) => void) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  loginUser: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; message?: string }>;
  loginWithBiometric: (email: string) => Promise<{ ok: boolean; message?: string }>;
  logoutUser: () => void;
  touchSession: () => void;
  toggleBiometric: () => void;
};

const Store = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(seed);
  const [auth, setAuth] = useState<AuthSession>(authSeed);
  const [ready, setReady] = useState(false);
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
  const writeQueue = useRef(Promise.resolve());
  const writeErrorShown = useRef(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [raw, authRaw] = await Promise.all([
          AsyncStorage.getItem(KEY),
          AsyncStorage.getItem(AUTH_KEY),
        ]);
        let savedAuth: AuthSession | null = null;
        let legacyState = seed;

        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!isAppState(saved)) {
            throw new Error("Los datos guardados de la app no tienen un formato válido.");
          }
          legacyState = normalizeAppState(saved);
        }

        if (authRaw) {
          const parsedAuth: unknown = JSON.parse(authRaw);
          if (!isAuthSession(parsedAuth)) {
            throw new Error("La sesión guardada no es válida.");
          }
          savedAuth = parsedAuth;
        }

        let verifiedUser: Awaited<ReturnType<typeof loadSupabaseUser>> = null;
        if (supabase) {
          verifiedUser = await loadSupabaseUser();
        }

        if (active) {
          if (verifiedUser) {
            const loadedState = await loadOrMigrateUserState(verifiedUser.id, legacyState);
            if (!active) return;
            setState(loadedState);
            setDataOwnerId(verifiedUser.id);
            const priorUser = savedAuth?.users.find(
              (user) => user.email.toLowerCase() === verifiedUser?.email?.toLowerCase()
            );
            const profile = profileFromSupabaseUser(
              verifiedUser,
              priorUser?.biometricEnabled ?? false
            );
            const wasExpiredSession =
              savedAuth?.isAuthenticated === true &&
              savedAuth.currentUserId === verifiedUser.id &&
              savedAuth.lastActivity !== null &&
              Date.now() - savedAuth.lastActivity > SESSION_TIMEOUT_MS;
            const sessionIsActive =
              savedAuth?.isAuthenticated === true &&
              savedAuth.currentUserId === verifiedUser.id &&
              savedAuth.lastActivity !== null &&
              !wasExpiredSession;
            const restoredAuth: AuthSession = {
              users: [profile],
              currentUserId: sessionIsActive ? profile.id : null,
              isAuthenticated: sessionIsActive,
              lastActivity: sessionIsActive ? savedAuth!.lastActivity : null,
              biometricEnabled: profile.biometricEnabled,
              biometricUnlockRequired: wasExpiredSession && profile.biometricEnabled,
            };
            setAuth(restoredAuth);
            if (wasExpiredSession && !profile.biometricEnabled && supabase) {
              const { error: signOutError } = await supabase.auth.signOut();
              if (signOutError) throw signOutError;
            }
          } else {
            setState(legacyState);
            const rememberedUsers = savedAuth?.users ?? [];
            setAuth({
              users: rememberedUsers,
              currentUserId: null,
              isAuthenticated: false,
              lastActivity: null,
              biometricEnabled: rememberedUsers.some((user) => user.biometricEnabled),
              biometricUnlockRequired: false,
            });
          }
        }
      } catch (error) {
        Alert.alert(
          "No se pudieron sincronizar tus finanzas",
          error instanceof Error
            ? `${error.message} Aplica la migración SQL incluida en supabase/migrations y vuelve a iniciar sesión.`
            : "Aplica la migración SQL incluida en supabase/migrations y vuelve a iniciar sesión."
        );
      } finally {
        if (active) setReady(true);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setAuth((current) => ({
          ...current,
          currentUserId: null,
          isAuthenticated: false,
          lastActivity: null,
        }));
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated || auth.lastActivity === null) return;

    const expireIfInactive = () => {
      if (Date.now() - auth.lastActivity! <= SESSION_TIMEOUT_MS) return;

      setAuth((current) => {
        if (
          !current.isAuthenticated ||
          current.lastActivity !== auth.lastActivity ||
          Date.now() - current.lastActivity! <= SESSION_TIMEOUT_MS
        ) {
          return current;
        }
        return {
          ...current,
          currentUserId: null,
          isAuthenticated: false,
          lastActivity: null,
          biometricUnlockRequired: current.biometricEnabled,
        };
      });

      if (!auth.biometricEnabled && supabase) {
        void supabase.auth.signOut().then(({ error }) => {
          if (error) Alert.alert("No se pudo cerrar la sesión", error.message);
        }).catch((error: unknown) => {
          Alert.alert(
            "No se pudo cerrar la sesión",
            error instanceof Error ? error.message : "Inténtalo de nuevo."
          );
        });
      }
    };

    const timeUntilExpiry = Math.max(
      100,
      SESSION_TIMEOUT_MS - (Date.now() - auth.lastActivity)
    );
    const timer = setTimeout(expireIfInactive, timeUntilExpiry);
    const subscription = NativeAppState.addEventListener("change", (nextState) => {
      if (nextState === "active") expireIfInactive();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [auth.isAuthenticated, auth.lastActivity, auth.biometricEnabled]);

  useEffect(() => {
    if (!ready || !dataOwnerId) return;

    const snapshot = JSON.stringify(state);
    const financialState = state;
    const persist = async () => {
      try {
        await AsyncStorage.setItem(userStateDirtyKey(dataOwnerId), "true");
        await AsyncStorage.setItem(userStateKey(dataOwnerId), snapshot);
        await writeFinancialState(dataOwnerId, financialState);
        await AsyncStorage.removeItem(userStateDirtyKey(dataOwnerId));
        writeErrorShown.current = false;
      } catch (error: unknown) {
        if (writeErrorShown.current) return;
        writeErrorShown.current = true;
        Alert.alert(
          "No se pudieron sincronizar tus finanzas",
          error instanceof Error
            ? `${error.message} Tus cambios quedan en la copia local y se intentará enviarlos al volver a iniciar sesión con internet.`
            : "Tus cambios quedan en la copia local y se intentará enviarlos al volver a iniciar sesión con internet."
        );
      }
    };
    writeQueue.current = writeQueue.current.then(persist, persist);
  }, [state, ready, dataOwnerId]);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth)).catch((error: unknown) => {
      Alert.alert(
        "No se pudo guardar tu cuenta",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    });
  }, [auth, ready]);

  const updateState = useCallback(
    (updater: (current: AppState) => AppState) => {
      setState(updater);
    },
    []
  );

  const hydrateFinancialData = useCallback(
    async (userId: string) => {
      const hydratedState = await loadOrMigrateUserState(userId, state);
      setState(hydratedState);
      setDataOwnerId(userId);
    },
    [state]
  );

  const currentUser = auth.users.find((user) => user.id === auth.currentUserId) ?? null;

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      users: auth.users,
      currentUser,
      currentUserId: auth.currentUserId,
      isAuthenticated: auth.isAuthenticated,
      lastActivity: auth.lastActivity,
      biometricEnabled: auth.biometricEnabled,
      biometricUnlockRequired: auth.biometricUnlockRequired ?? false,
      establecerSaldoInicial: (monto) => {
        if (!Number.isSafeInteger(monto)) {
          Alert.alert("Saldo inválido", "Ingresa un saldo entero válido.");
          return;
        }
        updateState((s) => ({
          ...s,
          saldoInicial: monto,
          mesSaldoInicial: claveMes(),
        }));
      },
      agregarMovimiento: (m) => {
        if (
          !Number.isSafeInteger(m.monto) ||
          m.monto <= 0 ||
          !m.categoria.trim() ||
          !m.cuenta.trim()
        ) {
          Alert.alert(
            "Movimiento inválido",
            "Verifica el monto, la categoría y la cuenta antes de guardar."
          );
          return;
        }
        updateState((s) => ({
          ...s,
          movimientos: [
            { ...m, id: nuevoId(), fecha: new Date().toISOString() },
            ...s.movimientos,
          ],
        }));
      },
      actualizarMovimiento: (id, changes) => {
        const detalleCategoria = changes.detalleCategoria?.trim();
        if (
          !Number.isSafeInteger(changes.monto) ||
          changes.monto <= 0 ||
          !changes.categoria.trim() ||
          (changes.categoria === "Otros" && !detalleCategoria)
        ) {
          Alert.alert(
            "Movimiento inválido",
            "Verifica el monto, la categoría y el nombre de Otros antes de guardar."
          );
          return;
        }
        if (!state.movimientos.some((movimiento) => movimiento.id === id)) {
          Alert.alert("Movimiento no encontrado", "Actualiza la pantalla e inténtalo de nuevo.");
          return;
        }
        updateState((current) => ({
          ...current,
          movimientos: current.movimientos.map((movimiento) =>
            movimiento.id === id
              ? {
                  ...movimiento,
                  monto: changes.monto,
                  categoria: changes.categoria.trim(),
                  detalleCategoria:
                    changes.categoria === "Otros" ? detalleCategoria : undefined,
                }
              : movimiento
          ),
        }));
      },
      eliminarMovimiento: (id) => {
        if (!state.movimientos.some((movimiento) => movimiento.id === id)) return;
        updateState((current) => quitarDelEstado(current, id));
      },
      agregarCuota: (c) => {
        if (!c.nombre.trim() || !Number.isSafeInteger(c.monto) || c.monto <= 0) {
          Alert.alert(
            "Registro inválido",
            "Verifica la descripción y el monto antes de guardar."
          );
          return;
        }
        updateState((s) => ({
          ...s,
          cuotas: [...s.cuotas, { ...c, id: nuevoId() }],
        }));
      },
      alternarCuota: (id) =>
        updateState((s) => ({
          ...s,
          cuotas: s.cuotas.map((c) => (c.id === id ? { ...c, pagada: !c.pagada } : c)),
        })),
      aportarMeta: (id, monto) => {
        if (!Number.isSafeInteger(monto) || monto <= 0) {
          Alert.alert("Aporte inválido", "El aporte debe ser un monto mayor que cero.");
          return;
        }
        updateState((s) => ({
          ...s,
          metas: s.metas.map((g) => {
            if (g.id !== id) return g;
            const aportado = Math.min(g.objetivo, g.aportado + monto);
            return Number.isSafeInteger(aportado) ? { ...g, aportado } : g;
          }),
        }));
      },
      agregarMeta: (m) => {
        if (
          !m.nombre.trim() ||
          !Number.isSafeInteger(m.objetivo) ||
          m.objetivo <= 0 ||
          Number.isNaN(Date.parse(m.fechaMeta))
        ) {
          Alert.alert(
            "Meta inválida",
            "Verifica el nombre, el objetivo y la fecha antes de guardar."
          );
          return;
        }
        updateState((s) => ({
          ...s,
          metas: [...s.metas, { ...m, id: nuevoId(), aportado: 0 }],
        }));
      },
      guardarPresupuesto: (presupuesto) => {
        if (
          !presupuesto.categoria.trim() ||
          (presupuesto.categoria === "Otros" &&
            !presupuesto.detalleCategoria?.trim()) ||
          !Number.isSafeInteger(presupuesto.monto) ||
          presupuesto.monto <= 0 ||
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(presupuesto.mes)
        ) {
          Alert.alert(
            "Presupuesto inválido",
            "Verifica la categoría, el monto y el mes antes de guardar."
          );
          return;
        }
        updateState((s) => ({
          ...s,
          presupuestos: [
            ...(s.presupuestos ?? []).filter(
              (item) =>
                !(
                  item.categoria === presupuesto.categoria &&
                  item.mes === presupuesto.mes &&
                  (item.detalleCategoria ?? "") === (presupuesto.detalleCategoria ?? "")
                )
            ),
            { ...presupuesto, id: nuevoId() },
          ],
        }));
      },
      borrarPresupuesto: (id) => {
        updateState((s) => ({
          ...s,
          presupuestos: (s.presupuestos ?? []).filter((item) => item.id !== id),
        }));
      },
      registerUser: async (
        { nombre, apellidos, fechaNacimiento, email, password },
        onProgress
      ) => {
        const normalizedEmail = email.trim().toLowerCase();
        const validationError = validateRegistration(
          { nombre, apellidos, fechaNacimiento, email, password },
          []
        );
        if (validationError) return { ok: false, message: validationError };

        onProgress?.("Creando tu cuenta...");
        const client = requireSupabase();
        const { data, error } = await client.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              nombre: nombre.trim(),
              apellidos: apellidos.trim(),
              fecha_nacimiento: fechaNacimiento.trim(),
            },
          },
        });

        if (error) {
          return { ok: false, message: emailAuthErrorMessage(error.message) };
        }

        if (!data.user) {
          return {
            ok: false,
            message: "Supabase no devolvió una cuenta. Revisa la configuración de Auth del proyecto.",
          };
        }

        if (!data.session) {
          return {
            ok: false,
            message:
              "Supabase todavía exige confirmar el correo. En Authentication → Sign In / Providers → Email, desactiva «Confirm email» y vuelve a intentarlo. Si esta cuenta ya aparece en Supabase, elimínala o confírmala desde Authentication → Users.",
          };
        }

        try {
          await hydrateFinancialData(data.user.id);
        } catch (caught) {
          const { error: signOutError } = await client.auth.signOut();
          const details = caught instanceof Error ? caught.message : "Error desconocido.";
          return {
            ok: false,
            message: `La cuenta se creó, pero no se pudo preparar la base de datos financiera. Ejecuta el archivo SQL indicado en el README y vuelve a iniciar sesión. ${details}${signOutError ? ` No se pudo cerrar la sesión: ${signOutError.message}` : ""}`,
          };
        }

        const priorUser = auth.users.find(
          (user) => user.email.toLowerCase() === normalizedEmail
        );
        const profile = profileFromSupabaseUser(data.user, priorUser?.biometricEnabled ?? false);
        const nextAuth = authenticatedSession(profile);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(nextAuth));
        setAuth(nextAuth);
        return { ok: true };
      },
      loginUser: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const client = requireSupabase();
        const { data, error } = await client.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          if (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message)) {
            return {
              ok: false,
              message: "La confirmación de correo sigue activa en Supabase. Desactiva «Confirm email» en Authentication → Sign In / Providers → Email.",
            };
          }
          return { ok: false, message: "Correo o contraseña incorrectos." };
        }

        try {
          await hydrateFinancialData(data.user.id);
        } catch (caught) {
          const { error: signOutError } = await client.auth.signOut();
          const details = caught instanceof Error ? caught.message : "Error desconocido.";
          return {
            ok: false,
            message: `No se pudieron cargar tus finanzas. Verifica que aplicaste la migración SQL y vuelve a intentar. ${details}${signOutError ? ` No se pudo cerrar la sesión: ${signOutError.message}` : ""}`,
          };
        }

        const priorUser = auth.users.find(
          (user) => user.email.toLowerCase() === normalizedEmail
        );
        const profile = profileFromSupabaseUser(data.user, priorUser?.biometricEnabled ?? false);
        const nextAuth = authenticatedSession(profile);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(nextAuth));
        setAuth(nextAuth);
        return { ok: true };
      },
      requestPasswordReset: async (email) => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
          return { ok: false, message: "Escribe el correo de tu cuenta." };
        }
        const { error } = await withAuthRequestTimeout(
          requireSupabase().auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: Linking.createURL("auth/reset-password"),
          })
        );
        if (error) {
          return {
            ok: false,
            message: error.message,
          };
        }
        return {
          ok: true,
          message: "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.",
        };
      },
      loginWithBiometric: async (email) => {
        const normalizedEmail = email.trim().toLowerCase();
        const user = auth.users.find(
          (item) =>
            item.email.toLowerCase() === normalizedEmail &&
            item.biometricEnabled
        );

        if (!user) {
          return {
            ok: false,
            message: "No hay inicio con huella activado para esta cuenta.",
          };
        }

        const verifiedUser = await loadSupabaseUser();
        if (!verifiedUser || verifiedUser.email?.toLowerCase() !== normalizedEmail) {
          return {
            ok: false,
            message: "Inicia sesión con tu correo y contraseña antes de usar la huella.",
          };
        }

        const nextAuth = authenticatedSession(user, verifiedUser.id);
        setAuth(nextAuth);
        return { ok: true };
      },
      logoutUser: () => {
        if (supabase && !auth.biometricEnabled) {
          void supabase.auth.signOut().then(({ error }) => {
            if (error) {
              Alert.alert("No se pudo cerrar la sesión remota", error.message);
            }
          }).catch((error: unknown) => {
            Alert.alert(
              "No se pudo cerrar la sesión remota",
              error instanceof Error ? error.message : "Inténtalo de nuevo."
            );
          });
        }
        setAuth((current) => ({
          ...current,
          currentUserId: null,
          isAuthenticated: false,
          lastActivity: null,
          biometricUnlockRequired: false,
        }));
      },
      touchSession: () => {
        setAuth((current) =>
          current.isAuthenticated &&
          (current.lastActivity === null || Date.now() - current.lastActivity >= 5000)
            ? { ...current, lastActivity: Date.now() }
            : current
        );
      },
      toggleBiometric: () => {
        if (!auth.currentUserId) return;
        setAuth((current) => ({
          ...current,
          users: current.users.map((user) =>
            user.id === current.currentUserId
              ? { ...user, biometricEnabled: !user.biometricEnabled }
              : user
          ),
          biometricEnabled: !current.biometricEnabled,
        }));
      },
    }),
    [auth, state, ready, updateState, hydrateFinancialData]
  );

  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export function useLukas() {
  const ctx = useContext(Store);
  if (!ctx) throw new Error("useLukas fuera de StoreProvider");
  return ctx;
}

export { movimientosDelMes, resumenMes } from "./finance";
