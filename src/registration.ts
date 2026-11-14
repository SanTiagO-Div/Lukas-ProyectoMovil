export type RegistrationInput = {
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  email: string;
  password: string;
};

export function validateRegistration(
  input: RegistrationInput,
  registeredEmails: readonly string[],
  now = new Date()
): string | null {
  const nombre = input.nombre.trim();
  const apellidos = input.apellidos.trim();
  const fechaNacimiento = input.fechaNacimiento.trim();
  const email = input.email.trim().toLowerCase();

  if (!nombre || !apellidos || !fechaNacimiento || !email || !input.password.trim()) {
    return "Completa todos los campos obligatorios.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    return "La fecha de nacimiento no es válida.";
  }

  const birthday = new Date(`${fechaNacimiento}T00:00:00.000Z`);
  if (
    Number.isNaN(birthday.getTime()) ||
    birthday.toISOString().slice(0, 10) !== fechaNacimiento
  ) {
    return "La fecha de nacimiento no es válida.";
  }

  const currentYear = now.getUTCFullYear();
  const birthYear = birthday.getUTCFullYear();
  const birthdayHasPassed =
    now.getUTCMonth() > birthday.getUTCMonth() ||
    (now.getUTCMonth() === birthday.getUTCMonth() &&
      now.getUTCDate() >= birthday.getUTCDate());
  const age = currentYear - birthYear - (birthdayHasPassed ? 0 : 1);
  if (age < 18) {
    return "Debes ser mayor de 18 años para usar la app.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Ingresa un correo electrónico válido.";
  }

  if (input.password.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (registeredEmails.some((registeredEmail) => registeredEmail.toLowerCase() === email)) {
    return "Este correo ya está registrado.";
  }

  return null;
}
