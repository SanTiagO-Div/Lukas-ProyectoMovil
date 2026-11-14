# Lukas (recreación)

- Nombre: Lukas 
- Expo SDK 58 · React Native 0.88
- Inicio, Presupuesto, Por pagar y cobrar, Informes, anotar movimiento
- Datos financieros sincronizados con PostgreSQL de Supabase y caché local
- Resúmenes y gastos por categoría del mes calendario actual
- El saldo final arrastra automáticamente los ingresos y gastos registrados de meses anteriores al mes actual
- Registro manual de ingresos, gastos y traslados
- Eliminación de movimientos con confirmación y recálculo inmediato de saldos
- Presupuestos mensuales muestran automáticamente lo usado y disponible a partir de los gastos registrados por categoría
- Montos con separadores de miles en formularios y saldo inicial editable desde Presupuesto
- Gestión local de metas de ahorro y de pagos/deudas por cobrar
- Instalaciones nuevas comienzan sin datos ficticios; el saldo inicial se configura desde Inicio

## Cómo correrlo

Requiere Node.js 22.6 o superior.

```bash
cd C:\Users\ASUS\Downloads\lukas-finanzas-app
npm install
npx expo start
```

npx expo start --lan --port 8082 --clear


Abre Expo Go en el teléfono y escanea el QR.

### Configurar cuentas (Supabase)

1. Crea un proyecto en Supabase.
2. En **Project Settings → API**, copia la Project URL y la clave pública `publishable`
   (o la clave heredada `anon`).
3. En **Authentication → Sign In / Providers → Email**, desactiva **Confirm email** para que el alta no dependa de enviar un correo. Las cuentas nuevas iniciarán sesión al crearse.
4. Copia `.env.example` como `.env` y reemplaza sus valores:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica
   ```

5. En el panel de Supabase abre **SQL Editor → New query**. Copia y ejecuta
   todo el contenido de
   [`supabase/migrations/20261012000000_create_user_financial_state.sql`](./supabase/migrations/20261012000000_create_user_financial_state.sql).
   Esto crea el almacenamiento financiero y las políticas RLS para que cada
   usuario solo pueda acceder a sus propios datos.
6. Reinicia Expo con `npx expo start --tunnel --clear`.
7. Para que funcione **¿Olvidaste tu contraseña?**, permite también la URL de
   recuperación en **Authentication → URL Configuration → Redirect URLs**.
   Agrega exactamente estos destinos (son rutas diferentes y una no reemplaza
   a la otra):

   ```text
   exp://**/--/auth/reset-password
   finanzasapp://auth/reset-password
   ```

   El primero es para Expo Go; el segundo, para una compilación instalada. No
   basta con permitir `.../auth/callback` ni la dirección raíz
   `exp://<host-del-túnel>`: Supabase necesita que coincida también la ruta
   `/--/auth/reset-password`. En
   **Authentication → Email Templates → Reset Password**, conserva el enlace
   `{{ .ConfirmationURL }}` para que Supabase aplique el `redirectTo` solicitado
   por la app; no construyas el destino usando `{{ .SiteURL }}`. Solicita un
   enlace nuevo después de guardar estos cambios, porque los correos anteriores
   mantienen el destino con el que fueron generados. Los enlaces se envían por
   correo, así que Supabase debe tener habilitado el envío de email y un
   proveedor SMTP configurado si se supera el límite del proveedor integrado.

La clave pública (publishable/anon) se incluye en la app y no es un secreto.
Nunca pongas la `service_role` key en el cliente. Supabase Auth gestiona las
contraseñas y sesiones. El saldo inicial, movimientos, cuotas, metas y
presupuestos se guardan por usuario en PostgreSQL; AsyncStorage mantiene una
copia local para abrir la app y recuperar cambios si falla una escritura.
La app bloquea el acceso tras 10 minutos sin interacción. Si activaste la huella
en Ajustes, al volver solicitará la biometría y conservará la sesión de Supabase
para permitir ese desbloqueo; si no está activada, cerrará la sesión y pedirá
correo y contraseña. El bloqueo también se aplica al volver a abrir la app tras
ese tiempo. Para salir manualmente de la cuenta, usa el botón de cerrar sesión.

Al iniciar sesión, la app descarga los datos del servidor. Si todavía no hay
datos remotos para esa cuenta, migra automáticamente el estado local antiguo
del dispositivo a la primera cuenta que inicie sesión y lo conserva como caché
separada por usuario. Si usas varios dispositivos, conéctalos a internet antes
de guardar cambios; si editas la misma cuenta simultáneamente desde varios
dispositivos, prevalecerá el último estado enviado. Las cuentas del sistema
local anterior no se migran: deberán registrarse de nuevo en Supabase.

Configura desde Inicio el saldo que tenías al comienzo del mes base. Los
movimientos de ese mes se suman desde esa referencia y los meses siguientes
arrastran el saldo calculado del mes anterior.

## Comprobaciones

```bash
npm test
npx tsc --noEmit
npx expo-doctor
```

## Lo que no está

- OCR real de pantallazos bancarios
- Chat de Lukas / bot de Telegram
- Iconos y splash originales

La selección de pantallazos solo permite elegir una imagen: no interpreta ni
guarda movimientos automáticamente. Registra esos movimientos manualmente para
evitar importes inventados.

Los datos se guardan localmente con AsyncStorage y no se cifran con una clave
propia de Lukas; protege el dispositivo con el bloqueo del sistema.

### Avisos de dependencias

La instalación de Expo SDK 58 reportó 12 avisos moderados en dependencias.
Ejecuta `npm audit` para ver el detalle actualizado; no uses
`npm audit fix --force`, porque puede instalar versiones incompatibles.

Por ahora:

1. Mantén las dependencias fijadas por `package-lock.json` y usa `npm ci` para
   instalaciones reproducibles.
2. No ejecutes `npm audit fix --force`, no sobrescribas las dependencias con
   versiones no publicadas y no uses un fork no revisado como arreglo.
3. Usa herramientas Expo/Metro únicamente en un entorno de desarrollo confiable
   y mantén actualizados Expo y React Native dentro de las versiones compatibles
   del SDK.
4. Revisa `npm audit` después de actualizar Expo y aplica cambios compatibles.

Estos avisos pertenecen a la cadena de herramientas y no significan por sí solos
que el código de la app incluya esas dependencias en su bundle de producción.
