# Qubika Studio

Aplicación web interna para **organizar y controlar** las tareas de un equipo
pequeño (6–10 personas) que apoya manualmente las publicaciones de Instagram y
TikTok. Cada integrante recibe un **horario diferente** para evitar que dos
personas actúen al mismo tiempo, abre los enlaces, realiza las actividades
**manualmente** y marca cada tarea como completada.

> La app **no automatiza** ninguna acción en Instagram o TikTok: no da likes,
> no comenta, no guarda, no comparte, no hace scraping ni usa APIs privadas de
> las redes. Es solo una herramienta de asignación de horarios y registro de
> cumplimiento.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** (tema claro/oscuro, diseño móvil)
- **Supabase** (Auth + Postgres + Row Level Security). Sin Prisma.
- Zona horaria de negocio: **America/Bogota** (UTC-5).

## Estructura

```
src/
  app/
    login/ recuperar/ actualizar-clave/ auth/callback/   # autenticación
    admin/                                               # área administrador
      publicaciones/  integrantes/  cumplimiento/
    app/                                                 # área integrante (móvil)
      tareas/  cumplimiento/  notificaciones/
  components/          # UI reutilizable (TaskCard, badges, header, etc.)
  lib/
    rotation.ts        # algoritmo puro de asignación + rotación (con tests)
    assignmentView.ts  # estado efectivo de una asignación
    weekly.ts          # cálculo de cumplimiento semanal
    datetime.ts        # helpers de zona horaria (Bogotá)
    supabase/          # clientes browser / server / admin
supabase/migrations/   # 0001_init.sql (tablas), 0002_rls_and_rpc.sql (RLS+RPC)
scripts/seed.mjs       # datos de demostración
```

## Puesta en marcha local

1. **Dependencias**

   ```bash
   npm install
   ```

2. **Variables de entorno** — copia `.env.example` a `.env.local` y rellena con
   los valores de tu proyecto Supabase (Project Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # o la "publishable key"
   SUPABASE_SERVICE_ROLE_KEY=...            # o la "secret key" (solo servidor)
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Base de datos** — en el **SQL Editor** de Supabase, ejecuta en orden:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls_and_rpc.sql`

4. **Primer administrador** — crea el usuario en Supabase (Authentication →
   Users) y luego promuévelo:

   ```sql
   update profiles set role = 'admin' where email = 'tu-correo@dominio.com';
   ```

5. **Datos de prueba** (opcional):

   ```bash
   node scripts/seed.mjs --admin tu-correo@dominio.com
   ```

   Crea 6 integrantes (contraseña `Demo1234!`), 3 publicaciones con horarios
   rotados y tareas completadas / pendientes / vencidas / justificadas.

6. **Ejecutar**

   ```bash
   npm run dev        # http://localhost:3000
   npm test           # pruebas del algoritmo de rotación
   npm run build      # build de producción
   ```

## Despliegue en Vercel

1. Sube el repositorio a GitHub (el `.gitignore` ya excluye `.env*`).
2. En Vercel: **New Project** → importa el repo (framework Next.js autodetectado).
3. **Environment Variables**: añade las 4 variables del paso 2, con
   `NEXT_PUBLIC_SITE_URL` apuntando a tu dominio de Vercel.
4. En Supabase → **Authentication → URL Configuration**, añade tu dominio de
   Vercel a *Site URL* y *Redirect URLs* (`https://tu-dominio/auth/callback`).
5. Deploy.

## Lógica de rotación (explicación)

Con `N` integrantes activos y un contador global `rotation_state.last_rotation_index`:

1. Al **Generar horarios**, se toma la lista estable de integrantes activos
   (ordenada por `created_at`).
2. `offset = last_rotation_index % N`. El orden se rota `offset` posiciones a la
   izquierda, de modo que **quién empieza cambia en cada publicación**:
   - Publicación 1 → `P1, P2, P3, P4, P5, P6`
   - Publicación 2 → `P2, P3, P4, P5, P6, P1`
   - Publicación 3 → `P3, P4, P5, P6, P1, P2`
3. La posición `i` (0-based) recibe:
   `assigned = publicación + intervalo · (i + 1)` y
   `deadline = assigned + ventana_de_finalización`.
   Ejemplo (pub 6:00 p. m., intervalo 20 min): 6:20, 6:40, 7:00, 7:20, 7:40, 8:00.
   Nunca hay dos personas en el mismo horario.
4. Tras generar, `last_rotation_index` se incrementa en 1 y se guarda
   `last_starting_user_id`, garantizando un reparto justo de los primeros y
   últimos turnos a lo largo del tiempo.
5. El admin puede **editar manualmente** cualquier horario después de generarlo.

El algoritmo es una función pura (`src/lib/rotation.ts`) cubierta por pruebas
(`src/lib/rotation.test.ts`): reproduce el ejemplo del requerimiento, verifica
que no haya horarios duplicados y que cada persona sea la primera exactamente
una vez cada `N` publicaciones.

## Estados de una tarea

`programada` → `disponible` → `completada` / `completada fuera de tiempo`;
además `vencida`, `justificada` y `en revisión`. Los estados dependientes del
tiempo (disponible / vencida) se derivan del reloj en `assignmentView.ts`; los
terminales (completada, justificada…) se guardan en la base de datos.

## Seguridad (RLS)

Row Level Security activo en todas las tablas. Reglas clave:

- Un integrante **solo lee sus propios** perfil, asignaciones, confirmaciones y
  avisos; nunca los de los demás.
- Los integrantes **no** pueden crear/editar publicaciones ni cambiar horarios.
- La confirmación de tareas se hace **solo** vía las funciones RPC
  `confirm_task` / `register_link_open` (`SECURITY DEFINER`), que **fijan la
  hora en el servidor** (`now()`): el integrante no puede falsear la fecha/hora
  de cumplimiento.
- Constraint `unique (assignment_id, platform)`: una sola confirmación válida
  por red y asignación.
- Solo el admin genera asignaciones y ve el cumplimiento de todo el equipo.
- Usuarios inactivos no pueden entrar (verificado en login y en el guard de
  servidor).

Toda acción sensible se valida **en el servidor** (Server Actions / Route
Handlers), no solo en el frontend.

## Registro de actividad

Cada confirmación guarda usuario, publicación, red, fecha/hora, estado
(a tiempo/tarde), IP y navegador (capturados en el servidor), y la hora de
apertura del enlace. Abrir el enlace **no** marca cumplimiento: existe un botón
independiente de confirmación por cada red.

## Notificaciones

MVP con notificaciones **dentro de la app** (tabla `notifications`, sección
"Avisos"). La arquitectura queda preparada para añadir después correo,
notificaciones push o WhatsApp: basta con un worker que lea `notifications` y
las envíe por el canal correspondiente. WhatsApp **no** está integrado en esta
versión.

## Fuera de alcance (esta versión)

Pagos, gamificación, rankings públicos, chat interno, automatización de redes,
APIs de Instagram/TikTok, capturas de pantalla e IA.
