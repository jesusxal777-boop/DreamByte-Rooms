# DreamByte Rooms

Bot de Discord que permite a un humano conversar junto a múltiples IAs (ChatGPT, Claude, Grok, Gemini) en la misma sala.

Cada canal de Discord actúa como una **sala** independiente con su propio contexto, modo de autonomía e historial reciente.

## Características del MVP

- Conexión a Discord con slash commands
- Sistema de contexto por sala (`/context`)
- Modos de autonomía: **red** / **yellow** / **green**
- AI Router que decide qué agentes responden
- Agentes configurables (ChatGPT, Claude, Grok, Gemini)
- Historial reciente por sala (en memoria)
- Proveedores desacoplados (OpenAI, Anthropic, xAI, Google)
- Arquitectura lista para voz, screen sharing, memoria persistente, MCP, etc.

## Requisitos

- Node.js 18+
- Cuenta de Discord y un bot creado en el [Developer Portal](https://discord.com/developers/applications)
- API keys de los proveedores que quieras usar (al menos una)

## Instalación

```bash
git clone https://github.com/jesusxal777-boop/DreamByte-Rooms.git
cd DreamByte-Rooms
npm install
cp .env.example .env
# Edita .env con tus tokens y API keys
```

## Configuración del bot de Discord

1. Ve a https://discord.com/developers/applications
2. **New Application** → ponle nombre (ej. DreamByte Rooms)
3. En **Bot**:
   - Create Bot
   - Copia el **Token** → `DISCORD_TOKEN`
   - Activa **Message Content Intent** (Privileged Gateway Intents)
4. En **OAuth2 → General**: copia el **Client ID** → `DISCORD_CLIENT_ID`
5. En **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Message History`, `View Channels`, `Embed Links`
   - Copia la URL e invita el bot a tu servidor

### Variables de entorno (`.env`)

```env
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
# Opcional para desarrollo (registro de comandos más rápido)
# DISCORD_GUILD_ID=tu_id_de_servidor

OPENAI_API_KEY=...          # ChatGPT
ANTHROPIC_API_KEY=...       # Claude
XAI_API_KEY=...             # Grok
GOOGLE_API_KEY=...          # Gemini (opcional)
```

## Registrar slash commands

```bash
# Desarrollo (comandos de guild, aparecen al instante)
# Asegúrate de tener DISCORD_GUILD_ID en .env
npm run register-commands

# Producción (comandos globales, pueden tardar hasta 1h)
# Quita DISCORD_GUILD_ID o déjalo vacío
npm run register-commands
```

## Ejecutar

```bash
# Desarrollo (hot-ish con tsx)
npm run dev

# Producción
npm run build
npm start
```

## Uso en Discord

### `/context`

| Subcomando | Descripción |
|------------|-------------|
| `/context set texto:...` | Establece el contexto de la sala |
| `/context show` | Muestra contexto y modo actuales |
| `/context clear` | Limpia el contexto |
| `/context mode modo:red\|yellow\|green` | Cambia el modo de autonomía |

**Modos:**

- 🔴 **red**: las IAs solo responden si las mencionas (ej. "claude, ¿qué opinas?")
- 🟡 **yellow** (default): responden cuando el mensaje parece relevante o hay mención
- 🟢 **green**: participan de forma más autónoma

Solo escribe en el canal. No hace falta un comando por cada mensaje. El bot decide qué agentes intervienen según el router y el modo.

Puedes mencionar agentes por nombre: `claude`, `grok`, `chatgpt`, `gemini`.

## Estructura del proyecto

```
src/
├── index.ts                 # Entrada del bot
├── registerCommands.ts      # Registro de slash commands
├── types/index.ts           # Tipos e interfaces
├── agents/
│   ├── defaultAgents.ts     # Definición de agentes
│   └── agentExecutor.ts     # Ejecuta agentes seleccionados
├── commands/
│   └── context.ts           # /context
├── providers/
│   ├── base.ts
│   ├── openai.ts
│   ├── anthropic.ts
│   ├── xai.ts
│   ├── google.ts
│   └── index.ts             # Registry
├── router/
│   └── agentRouter.ts       # Decide qué agentes responden
├── rooms/
│   └── roomManager.ts       # Estado por sala (memoria)
└── utils/
    └── discordHelpers.ts
```

## AI Router

El módulo `src/router/agentRouter.ts` recibe:

- contexto de la sala
- modo de autonomía
- mensaje
- historial
- agentes disponibles
- menciones explícitas

Y devuelve qué agentes deben responder, con prioridad y motivo.

No está acoplado a ningún proveedor. Puedes reemplazarlo por un router basado en LLM más adelante.

## Cómo añadir un nuevo proveedor

1. Crea `src/providers/mi-proveedor.ts` implementando `AIProvider` (ver `base.ts`).
2. Regístralo en `src/providers/index.ts`.
3. Añade un agente en `defaultAgents.ts` con `providerId: 'mi-proveedor'`.
4. Añade la variable de entorno correspondiente en `.env.example`.

## Preparado para el futuro

La arquitectura deja puntos de extensión limpios para:

- Discord Voice / STT / TTS
- Screen sharing y análisis de pantalla
- Archivos adjuntos
- Memoria persistente (Supabase u otro `MemoryStore`)
- MCP Gateway, GitHub, Composio
- BYOK y dashboard web

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Ejecuta con tsx |
| `npm run build` | Compila TypeScript |
| `npm start` | Ejecuta la versión compilada |
| `npm run typecheck` | Solo type-check |
| `npm run register-commands` | Registra slash commands |

## Licencia

MIT
