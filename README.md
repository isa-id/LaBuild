# LaBuild

Aplicación web (PWA) para gestionar una rutina semanal de entrenamiento sin
equipamiento enfocada a **ganar masa muscular**, con control de cumplimiento,
rachas, penitencias, gamificación y seguimiento del plan alimentario.

Se instala desde el navegador como acceso directo y funciona como app nativa
(móvil o escritorio), con modo sin conexión.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + API | Next.js 15 (App Router: frontend y backend en un solo deploy) |
| UI | Tailwind CSS v4 |
| PWA | Web App Manifest + Service Worker (sin dependencias externas) |
| Base de datos | PostgreSQL (Neon en producción) |
| ORM | Prisma 6 |
| Autenticación | JWT en cookie httpOnly (`jose`) + hash `scrypt` |
| Validación | Zod |
| Despliegue | Vercel (frontend **y** backend) + Neon Postgres |

### Por qué un solo deploy en Vercel

El backend va como *Route Handlers* dentro de la misma app Next.js. En el plan
gratuito de Vercel es mejor opción que Render porque:

- **Arranques en frío**: las funciones serverless levantan en ~100–300 ms. El
  free tier de Render hiberna tras 15 min de inactividad y tarda ~50 s en
  despertar, lo que rompe la experiencia de "marcar el entrenamiento al salir
  del gym".
- **Un solo proyecto**: sin CORS, sin URL de API que mantener.
- **Escalabilidad automática**: sin gestión de instancias.

Si más adelante necesitas backend siempre caliente o procesos largos, puedes
extraer las Route Handlers a un Web Service de Render sin tocar el frontend: los
contratos de la API ya están definidos en `src/app/api/**`.

---

## Despliegue

### 1. Crear la base de datos en Neon

1. Entra en [console.neon.tech](https://console.neon.tech) y crea un proyecto
   (el plan *Free* es suficiente).
2. **Crea una base de datos** con el nombre que quieras.
3. Ve a **Connection Details** y copia **dos** connection strings:
   - **Pooled connection** → será `DATABASE_URL`
   - **Direct connection** → será `DIRECT_URL`

El *pooled* es obligatorio para serverless: Neon limita las conexiones y Prisma
las agota rápido en funciones lambdas.

Si no tienes cuenta en Neon, `DATABASE_URL` también admite un Postgres normal
con `?sslmode=require` al final.

### 2. Publicar el código en GitHub

```bash
git init
git add .
git commit -m "LaBuild: rutina, rachas y nutrición"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/labuild.git
git push -u origin main
```

### 3. Importar en Vercel

1. Entra en [vercel.com/new](https://vercel.com/new).
2. Importa el repositorio de GitHub. **Vercel detecta Next.js solo**, no
   cambies el framework.
3. En **Environment Variables** agrega:

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | el *pooled* connection string de Neon |
   | `DIRECT_URL` | el *direct* connection string de Neon |
   | `JWT_SECRET` | una cadena larga y aleatoria |

   Para generar `JWT_SECRET` en PowerShell:

   ```powershell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
   ```

4. Deja el **Build Command** por defecto (`npm run build`).
5. **Deploy**.

### 4. Cargar la rutina, el plan alimentario y los logros

Las migraciones no corren solas en Vercel (el build no debe tocar el esquema en
producción). Carga los datos desde tu máquina:

```bash
git clone https://github.com/TU_USUARIO/labuild.git
cd labuild
npm install

# Copia las mismas variables que configuraste en Vercel.
# Si tu red abre el puerto 5432:
$env:DATABASE_URL="postgresql://...-pooler.../db?sslmode=require"
$env:DIRECT_URL="postgresql://.../db?sslmode=require"
npx prisma db push
npm run db:seed
```

Crea además un `.env` en la carpeta con `DATABASE_URL`, `DIRECT_URL` y
`JWT_SECRET`. Está en `.gitignore`, así que no se sube al repo, y te sirve
también para `npm run dev` local. En `.env`, quita `channel_binding=require` del
`DATABASE_URL`: no funciona bien con el pooler de PgBouncer.

`npm run db:seed` es **idempotente**: puedes ejecutarlo las veces que quieras
sin duplicar datos.

#### Si tu red bloquea el puerto 5432

Algunas redes (firewall del SO, del ISP o de una empresa) bloquean las
conexiones salientes al puerto 5432. Prisma no abre socket y falla con:

```
Error: P1001: Can't reach database server at `ep-xxx.region.aws.neon.tech:5432`
```

La base de datos está bien; sólo el puerto está cerrado. Neon expone un
endpoint HTTP en el 443 que habla el mismo SQL, así que el proyecto trae una
ruta alternativa que no necesita el 5432:

```bash
npm run db:push:http    # crea el esquema desde cero (base vacía)
npm run db:seed:http    # carga la rutina y el plan alimentario
```

`db:push:http` genera el DDL con `prisma migrate diff` (que no necesita
conexión) y lo aplica sentencia por sentencia. Antes de tocar nada comprueba
si el esquema ya existe, así que es seguro de repetir.

**`db:push:http` es sólo para una base vacía.** Cuando ya hay datos y hay que
añadir una columna, poner `NOT NULL` o crear una tabla, usa
`db:migrate:http` con un archivo en `migrations/`: son sentencias
incrementales idempotentes (`IF NOT EXISTS`), pensadas para reintentarse.

```bash
npm run db:migrate:http -- migrations/001-cuenta-avatar-reset.sql
```

Dos detalles que no son evidentes:

- El particionado de sentencias respeta los bloques `DO $$ ... $$` de plpgsql.
  Un `split(";")` ingenuo los parte por los `;` internos y Postgres responde
  `unterminated dollar-quoted string`.
- `CREATE TABLE IF NOT EXISTS` omite la clave foránea si la tabla ya existía,
  por eso la migración la añade aparte dentro de un `DO $$`.

**Esto sólo aplica a tu máquina.** La app en Vercel conecta por 5432 con
normalidad: Vercel no bloquea ese puerto. Si el error aparece en producción, no
es este problema.

#### Correr la app en local con el 5432 bloqueado

Lo anterior resuelve los scripts de esquema y seed, pero `npm run dev` también
necesita leer y escribir en la base. Con el 5432 cerrado, `src/lib/prisma.ts`
acepta cambiar al adaptador HTTP de Neon:

```env
# en tu .env local, NO en Vercel
LABUILD_HTTP_DB=1
```

Es el mismo SQL sobre otro transporte. En cuanto la variable está activa,
`npm run dev` y los tests funcionan contra Neon sin tocar el firewall.

#### Vercel y `DIRECT_URL`

Si provisionaste la base con la integración de Neon de Vercel, vas a tener
`DATABASE_URL` y `DATABASE_URL_UNPOOLED` en las variables del proyecto. La
primera es la pooled (la usa la app en cada request) y la segunda es la directa
sin pooler (la usa Prisma para cambios de esquema). Para `DIRECT_URL` local,
copia la segunda.

### 5. Verificar

Abre tu URL de Vercel, crea una cuenta y comprueba que:

- `/dashboard` muestra la rutina del día con los 7 días cargados
- la racha aparece en 0 y sube al completar un día
- `/nutrition` muestra el plan de comidas
- `https://tu-dominio.vercel.app/manifest.json` devuelve el manifest

---

## Uso diario

### Instalar como app

**Android / Chrome / Edge / Desktop**
1. Abre la URL en el navegador.
2. Aparece un banner de "Instala LaBuild" → **Instalar**.
   También disponible en el menú ⋮ → *Instalar aplicación*.

**iPhone / Safari**
1. Abre la URL en Safari (no desde otra app).
2. Toca el botón de compartir.
3. **Añadir a pantalla de inicio**.

Desde ese momento LaBuild se abre a pantalla completa, con su icono, sin barra
de navegador y con los atajos a Hoy, Semana y Nutrición.

### Marcar un día

En **Hoy**:
1. Marca cada ejercicio con el ✓ (y las repeticiones si quieres llevar conteo).
2. Al final: **✓ Cumplí** / **◐ Parcial** / **✗ No pude**.

| Botón | Efecto |
|---|---|
| ✓ Cumplí | +50 puntos, +2 × días de racha, puede desbloquear logros |
| ◐ Parcial | +20 puntos, la racha queda congelada (no rompe, no sube) |
| ✗ No pude | penitencia con deuda de repeticiones y puntos negativos |

En **Nutrición** marca cada comida para sumar puntos (comida +5, día completo +15).

En **Progreso** registra tu peso: 3–4 mañanas por semana, siempre después del
baño y antes de desayunar. La app promedia la semana y calcula el IMC.

### Reglas de racha

- Días de **entrenamiento**: completarlos incrementa la racha.
- **Domingo**: descanso. No incrementa, no rompe, nunca genera penitencia.
- **Jueves** (recuperación activa): neutral. No rompe la racha, pero sí genera
  penitencia si lo omites (configurable con `streakCountRecoveryDays`).
- **Omitir** un día de entrenamiento reinicia la racha a cero.

### Penitencias

| Día | Deuda |
|---|---|
| Lunes | 20 flexiones |
| Martes | 30 sentadillas |
| Miércoles | 25 superman |
| Jueves | 10 de movilidad |
| Viernes | 15 pike push-ups |
| Sábado | 20 sentadillas lentas |

Cumplir la penitencia devuelve **+15 puntos**.

### Configuración de la cuenta

`/settings` agrupa cuatro secciones:

| Sección | Qué hace |
| --- | --- |
| Perfil | Cambia nombre, email, edad, altura, peso de inicio y objetivo |
| Foto de perfil | Sube o quita una imagen |
| Contraseña | Cambia la contraseña confirmando la actual |
| Zona peligrosa | Borra la cuenta y todo su historial |

Detalles que conviene conocer:

- **La foto se guarda como data URL dentro de Postgres**, no en un servicio de
  archivos. Se redimensiona en el navegador a 256×256 px y se guarda en JPEG al
  85 % antes de subirla, así que ocupa ~20-40 KB en vez de varios MB. El límite
  del servidor es 300 KB y sólo se aceptan PNG, JPEG, WebP o SVG.
- **Cambiar la contraseña pide la actual.** Así, si alguien se apodera de una
  sesión, no puede dejarte la cuenta sin acceso.
- **Borrar la cuenta pide la contraseña y que escribas `BORRAR`.** Todas las
  relaciones están en `onDelete: Cascade`, así que una sola llamada limpia
  entrenamientos, comidas, peso, rachas, penitencias y logros.
- **El registro exige todos los campos** (nombre, email, contraseña, edad,
  altura y peso). Son obligatorios en el esquema (`NOT NULL`), no sólo en el
  formulario. La validación vive en `registerSchema` y el formulario replica los
  mismos rangos para no bloquearte la salida del servidor.

### Iconos

No hay emojis en la interfaz. Todo sale de `src/components/icons.tsx`, un
registro central sobre [Lucide](https://lucide.dev):

```tsx
import { Icon } from "@/components/icons";

<Icon name="flame" size={18} style={{ color: "var(--accent)" }} />
```

Lucide genera `<svg>` en línea con `currentColor`, así que los iconos heredan el
color del texto, no pesan fuentes ni hacen peticiones extra.

Un matiz honesto: el registro central referencia los ~66 iconos, y como cada uno
es alcanzable desde ahí, **todos** entran al bundle aunque una pantalla use
cuatro. Pesarían mucho más si fueran emoji renderizados por el sistema, pero no
es *tree shaking* real. Si el bundle creciera, el siguiente paso sería importar
el icono directamente en cada componente en vez de pasar por el registro; el
registro se paga en comodidad, no en peso.

Para comprobar que no se coló un emoji:

```bash
npx tsx scripts/find-emojis.ts
```

---

## Desarrollo local

```bash
npm install
cp .env.example .env    # en Windows: copy .env.example .env
```

Si usas Postgres local con Docker (el puerto 5432 a veces está ocupado en
Windows):

```bash
docker run -d --name labuild-pg -e POSTGRES_HOST_AUTH_METHOD=trust \
  -e POSTGRES_USER=labuild -e POSTGRES_DB=labuild -p 15432:5432 postgres:17-alpine
```

```env
DATABASE_URL="postgresql://labuild:labuild@localhost:15432/labuild"
DIRECT_URL="postgresql://labuild:labuild@localhost:15432/labuild"
```

```bash
npx prisma db push
npm run db:seed
npm run dev     # http://localhost:3000
```

### Tests

```bash
npm test              # lógica de rachas y penitencias (necesita BD)
npm run test:dates    # funciones de fecha (no necesita nada)
npm run test:pwa      # recursos PWA (necesita servidor en marcha)
npm run test:e2e      # smoke test HTTP completo (necesita servidor en marcha)
npm run test:settings # perfil, foto, contraseña y borrado (idem)
```

Contra Neon con el 5432 bloqueado, todo funciona igual definiendo
`LABUILD_HTTP_DB=1` en tu `.env`, tanto para el servidor como para los tests
que hablan con la base (`npm test`).

Los tests de PWA, e2e y de configuración esperan un servidor en marcha salvo
que les pases otra URL:

```bash
LABUILD_HTTP_DB=1 npm run dev -- -p 3113
npm run test:pwa      -- http://localhost:3113
npm run test:e2e      -- http://localhost:3113
npm run test:settings -- http://localhost:3113
```

`test:settings` crea una cuenta temporal, recorre perfil, foto, contraseña,
restablecimiento y borrado, y la elimina al final. No toca cuentas reales.

---

## Estructura

```
prisma/
  schema.prisma        Modelos de datos
  seed.ts              Rutina + plan alimentario + logros (idempotente)
migrations/
  001-*.sql            Cambios incrementales de esquema (ver más abajo)
public/
  manifest.json        Web App Manifest
  sw.js                Service Worker
  icon-*.png           Iconos generados por `npm run icons`
src/
  app/
    (auth)/            Login y registro
    (app)/             Dashboard, Semana, Nutrición, Progreso, Penitencias,
                       Configuración
    offline/           Página sin conexión
    reset-password/    Aplicar una nueva contraseña con token
    api/               Route Handlers
  components/
    NavBar.tsx         Sidebar en escritorio, barra inferior en móvil
    PwaRegistrar.tsx   Registro del SW e instalación
    Toast.tsx          Notificaciones
    icons.tsx          Registro central de iconos SVG
  lib/
    auth.ts            Sesión JWT
    password.ts        Hash scrypt + hash de tokens
    streak.ts          Cálculo de rachas
    penalties.ts       Reglas de penitencias
    gamification.ts    Puntos, niveles y logros
    progression.ts     Desbloqueo de variantes
    dates.ts           Utilidades de fecha
scripts/
  migrate-http.ts      Aplica migraciones incrementales por HTTP
  find-emojis.ts       Auditoría: lista emojis que queden en el código
  generate-icons.ts    Genera iconos PNG/ICO desde SVG
  smoke-test.ts        Prueba end-to-end por HTTP
  settings-test.ts     Prueba end-to-end del módulo de configuración
  streak-test.ts       Pruebas de la lógica de rachas
  pwa-test.ts          Verificación de recursos PWA
  neon-http.ts         Cliente SQL de Neon por HTTP (puerto 443)
  db-push-http.ts      Aplica el esquema sin usar el puerto 5432
```

## Notas técnicas

### Service Worker

Estrategia en `public/sw.js`:

- **Navegaciones**: red primero; si falla, muestra `/offline`. El HTML de
  páginas autenticadas **nunca** se guarda en caché, para que no quede visible
  si alguien más usa el mismo dispositivo.
- **Assets estáticos** (`/_next/static`, iconos, fuentes): caché primero, son
  inmutables y no contienen datos del usuario.
- **`/api/*`**: sólo red. Cachear respuestas de API filtraría datos de cuenta.

Para validar el modo sin conexión en DevTools: **Application → Service Workers →
Offline**, o en móvil con modo avión.

### Responsive

- Móvil: barra de navegación inferior, `env(safe-area-inset-*)` para notch y
  barra de gestos.
- Escritorio (≥1024px): sidebar fijo, navegación superior.
- Inputs a 16px mínimo para que iOS no haga zoom al enfocar.
- Área táctil de 44px en elementos interactivos.
- Respeta `prefers-reduced-motion`.
- Zoom del usuario permitido (`maximum-scale: 5`).

### Plantillas

La rutina y el plan alimentario están modelados como **plantillas**
(`WorkoutTemplate` / `MealPlanTemplate`), y cada usuario tiene un `UserProgram`
apuntando a su plantilla activa. Eso deja la puerta abierta a crear y asignar
plantillas propias más adelante sin cambiar el esquema.

### Nota de salud

Con 50 kg y 1,75 m el IMC es ~16,3, por debajo del rango de referencia habitual
para adultos. La app muestra un recordatorio al respecto, pero no sustituye la
valoración de un médico o nutricionista.