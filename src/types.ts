export type MovimientoTipo = "gasto" | "ingreso" | "traslado";

export type Movimiento = {
  id: string;
  tipo: MovimientoTipo;
  monto: number;
  categoria: string;
  detalleCategoria?: string;
  nota: string;
  fecha: string;
  cuenta: string;
};

export type Cuota = {
  id: string;
  nombre: string;
  monto: number;
  pagada: boolean;
  tipo: "pagar" | "cobrar";
  persona?: string;
};

export type Meta = {
  id: string;
  nombre: string;
  emoji: string;
  objetivo: number;
  aportado: number;
  fechaMeta: string;
};

export type Presupuesto = {
  id: string;
  categoria: string;
  detalleCategoria?: string;
  monto: number;
  mes: string;
};

export type AuthUser = {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  email: string;
  biometricEnabled: boolean;
};

export type AuthSession = {
  users: AuthUser[];
  currentUserId: string | null;
  isAuthenticated: boolean;
  lastActivity: number | null;
  biometricEnabled: boolean;
  biometricUnlockRequired?: boolean;
};

export type AppState = {
  cuenta: string;
  saldoInicial: number;
  mesSaldoInicial: string;
  movimientos: Movimiento[];
  cuotas: Cuota[];
  metas: Meta[];
  presupuestos?: Presupuesto[];
};
