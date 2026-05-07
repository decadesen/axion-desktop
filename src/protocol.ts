export type ProtocolVersion = "1.0";
export type MessageSource = "client" | "server";
export type CharacterContextPolicy = "keep" | "reset";

export interface EnvelopeBase {
  v: ProtocolVersion;
  id: string;
  ts: string;
  source: MessageSource;
  type: string;
}

export interface HelloMessage extends EnvelopeBase {
  source: "client";
  type: "hello";
  payload: {
    client: "electron-vue";
    sessionId: string;
    capabilities: string[];
  };
}

export interface ChatCreateMessage extends EnvelopeBase {
  source: "client";
  type: "agent.message.create";
  payload: {
    conversationId: string;
    text: string;
  };
}

export interface PetExpressionSetMessage extends EnvelopeBase {
  source: "client";
  type: "pet.expression.set";
  payload: {
    expression: string;
    intensity: number;
  };
}

export interface PetMotionPlayMessage extends EnvelopeBase {
  source: "client";
  type: "pet.motion.play";
  payload: {
    motion: string;
  };
}

export interface TtsSpeakMessage extends EnvelopeBase {
  source: "client";
  type: "tts.speak";
  payload: {
    conversationId?: string;
    text: string;
    voice?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    sampleRate?: number;
    format?: "wav" | "mp3" | "ogg";
  };
}

export interface AudioInputStartMessage extends EnvelopeBase {
  source: "client";
  type: "audio.input.start";
  payload: {
    conversationId: string;
    mimeType: string;
    languageHint?: string;
  };
}

export interface AudioInputChunkMessage extends EnvelopeBase {
  source: "client";
  type: "audio.input.chunk";
  payload: {
    conversationId: string;
    sequence: number;
    data: string;
  };
}

export interface AudioInputEndMessage extends EnvelopeBase {
  source: "client";
  type: "audio.input.end";
  payload: {
    conversationId: string;
  };
}

export interface SessionCharacterApplyMessage extends EnvelopeBase {
  source: "client";
  type: "session.character.apply";
  payload: {
    conversationId: string;
    avatarId: string;
    personaId?: string;
    contextPolicy: CharacterContextPolicy;
    newConversationId?: string;
    cancelOngoing?: boolean;
  };
}

export type ClientMessage =
  | HelloMessage
  | ChatCreateMessage
  | PetExpressionSetMessage
  | PetMotionPlayMessage
  | TtsSpeakMessage
  | AudioInputStartMessage
  | AudioInputChunkMessage
  | AudioInputEndMessage
  | SessionCharacterApplyMessage;

export interface ServerReadyMessage extends EnvelopeBase {
  source: "server";
  type: "server.ready";
  payload: {
    sessionId: string;
    now: string;
    providers: string[];
  };
}

export interface PetStateMessage extends EnvelopeBase {
  source: "server";
  type: "pet.state";
  payload: {
    expression: string;
    motion: string;
    speaking: boolean;
  };
}

export interface ReplyDeltaMessage extends EnvelopeBase {
  source: "server";
  type: "agent.reply.delta";
  payload: {
    conversationId: string;
    textDelta: string;
  };
}

export interface ReplyDoneMessage extends EnvelopeBase {
  source: "server";
  type: "agent.reply.done";
  payload: {
    conversationId: string;
    fullText: string;
  };
}

export interface TtsVisemeMessage extends EnvelopeBase {
  source: "server";
  type: "tts.viseme";
  payload: {
    viseme: string;
    weight: number;
  };
}

export interface ErrorMessage extends EnvelopeBase {
  source: "server";
  type: "error";
  payload: {
    code: string;
    message: string;
  };
}

export interface AsrResultMessage extends EnvelopeBase {
  source: "server";
  type: "asr.result";
  payload: {
    conversationId: string;
    text: string;
    confidence: number;
    language?: string;
  };
}

export interface AudioOutputStartMessage extends EnvelopeBase {
  source: "server";
  type: "audio.output.start";
  payload: {
    conversationId: string;
    mimeType: string;
    sampleRate: number;
    channels: number;
    format?: "wav" | "mp3" | "ogg";
    voice?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
  };
}

export interface AudioOutputChunkMessage extends EnvelopeBase {
  source: "server";
  type: "audio.output.chunk";
  payload: {
    conversationId: string;
    sequence: number;
    data: string;
  };
}

export interface AudioOutputEndMessage extends EnvelopeBase {
  source: "server";
  type: "audio.output.end";
  payload: {
    conversationId: string;
    totalChunks: number;
    durationMs: number;
  };
}

export interface SessionCharacterAppliedMessage extends EnvelopeBase {
  source: "server";
  type: "session.character.applied";
  payload: {
    avatarId: string;
    personaId?: string;
    previousConversationId: string;
    conversationId: string;
    contextPolicy: CharacterContextPolicy;
    appliedAt: string;
  };
}

export type ServerMessage =
  | ServerReadyMessage
  | PetStateMessage
  | ReplyDeltaMessage
  | ReplyDoneMessage
  | TtsVisemeMessage
  | AsrResultMessage
  | AudioOutputStartMessage
  | AudioOutputChunkMessage
  | AudioOutputEndMessage
  | SessionCharacterAppliedMessage
  | ErrorMessage;

export type SocketMessage = ClientMessage | ServerMessage;

export const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const nowIso = () => new Date().toISOString();

export const isServerMessage = (value: unknown): value is ServerMessage => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { source?: unknown; type?: unknown; payload?: unknown };
  return (
    candidate.source === "server" &&
    typeof candidate.type === "string" &&
    typeof candidate.payload === "object"
  );
};
