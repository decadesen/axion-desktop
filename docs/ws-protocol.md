# Pet WS Protocol v1.0

This protocol is used between the desktop shell (`Electron + Vue`) and your backend proxy (for example, an OpenClaw gateway).

## 1. Envelope

Every message uses this wrapper:

```json
{
  "v": "1.0",
  "id": "1744700000-a1b2c3",
  "ts": "2026-04-15T10:00:00.000Z",
  "source": "client",
  "type": "agent.message.create",
  "payload": {}
}
```

- `v`: protocol version (`1.0`)
- `id`: unique message id
- `ts`: ISO timestamp
- `source`: `client | server`
- `type`: message type
- `payload`: type-specific body

## 2. Client -> Server Messages (9)

### `hello`
- Purpose: capability handshake
- Payload:
  - `client: string`
  - `sessionId: string`
  - `capabilities: string[]`

### `agent.message.create`
- Purpose: send user text to LLM pipeline
- Payload:
  - `conversationId: string`
  - `text: string`

### `pet.expression.set`
- Purpose: request expression update
- Payload:
  - `expression: string`
  - `intensity: number`

### `pet.motion.play`
- Purpose: request motion update
- Payload:
  - `motion: string`

### `tts.speak`
- Purpose: request explicit TTS synthesis
- Payload:
  - `conversationId?: string`
  - `text: string`
  - `voice?: string`
  - `speed?: number`
  - `pitch?: number`
  - `volume?: number`
  - `sampleRate?: number`
  - `format?: "wav" | "mp3" | "ogg"`

### `audio.input.start`
- Purpose: begin microphone upload stream
- Payload:
  - `conversationId: string`
  - `mimeType: string`
  - `languageHint?: string`

### `audio.input.chunk`
- Purpose: send base64 audio chunk
- Payload:
  - `conversationId: string`
  - `sequence: number`
  - `data: string` (base64)

### `audio.input.end`
- Purpose: end microphone upload stream
- Payload:
  - `conversationId: string`

### `session.character.apply`
- Purpose: switch character/persona within current WS session
- Payload:
  - `conversationId: string` (current active conversation)
  - `avatarId: string`
  - `personaId?: string`
  - `contextPolicy: "keep" | "reset"`
  - `newConversationId?: string` (used when `contextPolicy="reset"`)
  - `cancelOngoing?: boolean`

## 3. Server -> Client Messages (11)

### `server.ready`
- Purpose: initial server handshake
- Payload:
  - `sessionId: string`
  - `now: string`
  - `providers: string[]`

### `pet.state`
- Purpose: current character animation state
- Payload:
  - `expression: string`
  - `motion: string`
  - `speaking: boolean`

### `agent.reply.delta`
- Purpose: streaming token delta
- Payload:
  - `conversationId: string`
  - `textDelta: string`

### `agent.reply.done`
- Purpose: final text response
- Payload:
  - `conversationId: string`
  - `fullText: string`

### `tts.viseme`
- Purpose: lip-sync signal
- Payload:
  - `viseme: string`
  - `weight: number`

### `asr.result`
- Purpose: transcript of uploaded voice input
- Payload:
  - `conversationId: string`
  - `text: string`
  - `confidence: number`
  - `language?: string`

### `audio.output.start`
- Purpose: begin audio output stream and return effective synth params
- Payload:
  - `conversationId: string`
  - `mimeType: string`
  - `sampleRate: number`
  - `channels: number`
  - `format?: "wav" | "mp3" | "ogg"`
  - `voice?: string`
  - `speed?: number`
  - `pitch?: number`
  - `volume?: number`

### `audio.output.chunk`
- Purpose: send base64 audio chunk
- Payload:
  - `conversationId: string`
  - `sequence: number`
  - `data: string` (base64)

### `audio.output.end`
- Purpose: end audio output stream
- Payload:
  - `conversationId: string`
  - `totalChunks: number`
  - `durationMs: number`

### `session.character.applied`
- Purpose: acknowledge effective character/persona switch
- Payload:
  - `avatarId: string`
  - `personaId?: string`
  - `previousConversationId: string`
  - `conversationId: string` (effective active conversation after switch)
  - `contextPolicy: "keep" | "reset"`
  - `appliedAt: string`

### `error`
- Purpose: protocol or backend errors
- Payload:
  - `code: string`
  - `message: string`

## 4. Character Switch Semantics

### Keep context
Use `contextPolicy = "keep"`.
- Backend returns `session.character.applied.conversationId = previousConversationId`.
- Existing dialogue memory is kept.

Example:

```json
{
  "type": "session.character.apply",
  "payload": {
    "conversationId": "conv-001",
    "avatarId": "mao_pro_zh",
    "personaId": "assistant_warm",
    "contextPolicy": "keep"
  }
}
```

### Reset context
Use `contextPolicy = "reset"`.
- Backend creates a new conversation id if `newConversationId` is not provided.
- Backend returns the new id in `session.character.applied.conversationId`.
- Previous dialogue memory is not reused.

Example:

```json
{
  "type": "session.character.apply",
  "payload": {
    "conversationId": "conv-001",
    "avatarId": "hero_alt",
    "personaId": "assistant_formal",
    "contextPolicy": "reset",
    "newConversationId": "conv-002"
  }
}
```

## 5. Suggested OpenClaw Mapping

- `agent.message.create` -> your `/chat/stream` endpoint
- stream tokens as `agent.reply.delta`
- emit `agent.reply.done` on completion
- speech pipeline emits `audio.output.*` and optional `tts.viseme`
- for voice input, accept `audio.input.*` and return `asr.result`
- apply persona/role prompt according to `avatarId + personaId`
- when `contextPolicy = "reset"`, start a new backend memory/session context
