import { money } from "./theme.ts";

export function crearMensajeCobro(nombrePersona: string, monto: number) {
  return `Hola ${nombrePersona}, te escribo desde Lukas para cobrar ${money(monto)}. ¿Me confirmas el pago?`;
}
