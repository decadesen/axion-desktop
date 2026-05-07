import { onBeforeUnmount, ref } from "vue";
import {
  createMessageId,
  isServerMessage,
  nowIso,
  type ClientMessage,
  type ServerMessage,
} from "../protocol";

type SocketState = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface ChatRow {
  role: "user" | "assistant";
  text: string;
  done?: boolean;
}

interface LogRow {
  ts: string;
  text: string;
}

interface SpeakOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  sampleRate?: number;
  format?: "wav" | "mp3" | "ogg";
}

interface CharacterApplyOptions {
  avatarId: string;
  personaId?: string;
  contextPolicy?: "keep" | "reset";
  newConversationId?: string;
  cancelOngoing?: boolean;
}

const appendWithLimit = <T>(list: T[], item: T, max: number) => {
  list.push(item);
  if (list.length > max) {
    list.splice(0, list.length - max);
  }
};

export const usePetSocket = (url: string) => {
  const socket = ref<WebSocket | null>(null);
  const state = ref<SocketState>("idle");
  const logs = ref<LogRow[]>([]);
  const chatRows = ref<ChatRow[]>([]);
  const expression = ref("idle");
  const motion = ref("standby");
  const speaking = ref(false);
  const viseme = ref("sil");
  const sessionId = ref("");
  const conversationId = ref("demo-conversation");
  const activeAvatarId = ref("mao_pro_zh");
  const activePersonaId = ref("default");
  const draftReply = ref("");
  const isRecording = ref(false);
  const micSupported = ref(
    typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined",
  );
  const isAudioPlaying = ref(false);
  const voiceError = ref("");

  let recorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioChunkSeq = 0;
  let currentOutputConversationId = "";
  let currentOutputMimeType = "audio/wav";
  let currentOutputChunks: Array<{ sequence: number; bytes: Uint8Array }> = [];
  const audioQueue: Blob[] = [];
  const audioEl = new Audio();

  audioEl.onplay = () => {
    isAudioPlaying.value = true;
  };
  audioEl.onended = () => {
    isAudioPlaying.value = false;
    void playNextAudio();
  };
  audioEl.onerror = () => {
    isAudioPlaying.value = false;
    addLog("audio output play error");
    void playNextAudio();
  };

  const addLog = (text: string) => {
    appendWithLimit(logs.value, { ts: new Date().toLocaleTimeString(), text }, 40);
  };

  const base64ToBytes = (base64: string): Uint8Array => {
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      out[i] = raw.charCodeAt(i);
    }
    return out;
  };

  const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const part = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode(...part);
    }
    return btoa(binary);
  };

  const playNextAudio = async () => {
    if (isAudioPlaying.value || audioQueue.length === 0) return;
    const blob = audioQueue.shift();
    if (!blob) return;

    const objectUrl = URL.createObjectURL(blob);
    audioEl.src = objectUrl;
    try {
      await audioEl.play();
    } catch {
      addLog("audio output blocked by autoplay policy");
      isAudioPlaying.value = false;
      URL.revokeObjectURL(objectUrl);
      void playNextAudio();
      return;
    }

    audioEl.onended = () => {
      isAudioPlaying.value = false;
      URL.revokeObjectURL(objectUrl);
      void playNextAudio();
    };
  };

  const sendMessage = (message: ClientMessage) => {
    if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
      addLog("socket not connected, ignored send");
      return;
    }
    socket.value.send(JSON.stringify(message));
  };

  const connect = () => {
    if (socket.value && socket.value.readyState <= WebSocket.OPEN) return;
    state.value = "connecting";
    addLog(`connecting to ${url}`);

    const ws = new WebSocket(url);
    socket.value = ws;

    ws.onopen = () => {
      state.value = "connected";
      const hello: ClientMessage = {
        v: "1.0",
        id: createMessageId(),
        ts: nowIso(),
        source: "client",
        type: "hello",
        payload: {
          client: "electron-vue",
          sessionId: createMessageId(),
          capabilities: ["chat", "pet", "tts", "audio_input", "audio_output"],
        },
      };
      sendMessage(hello);
      addLog("socket opened");
    };

    ws.onclose = () => {
      state.value = "disconnected";
      addLog("socket closed");
    };

    ws.onerror = () => {
      state.value = "error";
      addLog("socket error");
    };

    ws.onmessage = (event) => {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(event.data as string);
      } catch {
        addLog("received non-json message");
        return;
      }

      if (!isServerMessage(parsed)) {
        addLog("received unknown protocol message");
        return;
      }

      const message = parsed as ServerMessage;
      appendWithLimit(logs.value, { ts: new Date().toLocaleTimeString(), text: message.type }, 40);

      if (message.type === "server.ready") {
        sessionId.value = message.payload.sessionId;
      }

      if (message.type === "session.character.applied") {
        activeAvatarId.value = message.payload.avatarId;
        activePersonaId.value = message.payload.personaId || "default";
        conversationId.value = message.payload.conversationId;
        addLog(
          `character applied avatar=${activeAvatarId.value} policy=${message.payload.contextPolicy} conversation=${conversationId.value}`,
        );
      }

      if (message.type === "pet.state") {
        expression.value = message.payload.expression;
        motion.value = message.payload.motion;
        speaking.value = message.payload.speaking;
      }

      if (message.type === "tts.viseme") {
        viseme.value = message.payload.viseme;
      }

      if (message.type === "agent.reply.delta") {
        draftReply.value += message.payload.textDelta;
      }

      if (message.type === "agent.reply.done") {
        const finalText = message.payload.fullText || draftReply.value;
        appendWithLimit(chatRows.value, { role: "assistant", text: finalText, done: true }, 100);
        draftReply.value = "";
      }

      if (message.type === "asr.result") {
        appendWithLimit(chatRows.value, { role: "user", text: message.payload.text, done: true }, 100);
      }

      if (message.type === "audio.output.start") {
        currentOutputConversationId = message.payload.conversationId;
        currentOutputMimeType = message.payload.mimeType || "audio/wav";
        currentOutputChunks = [];
      }

      if (message.type === "audio.output.chunk") {
        if (message.payload.conversationId !== currentOutputConversationId) return;
        currentOutputChunks.push({
          sequence: message.payload.sequence,
          bytes: base64ToBytes(message.payload.data),
        });
      }

      if (message.type === "audio.output.end") {
        if (message.payload.conversationId !== currentOutputConversationId) return;
        const sorted = [...currentOutputChunks].sort((a, b) => a.sequence - b.sequence);
        const mergedLength = sorted.reduce((acc, cur) => acc + cur.bytes.length, 0);
        const merged = new Uint8Array(mergedLength);
        let offset = 0;
        for (const part of sorted) {
          merged.set(part.bytes, offset);
          offset += part.bytes.length;
        }
        audioQueue.push(new Blob([merged], { type: currentOutputMimeType }));
        void playNextAudio();
      }
    };
  };

  const disconnect = () => {
    socket.value?.close();
  };

  const sendChat = (text: string) => {
    if (!text.trim()) return;
    appendWithLimit(chatRows.value, { role: "user", text }, 100);
    draftReply.value = "";

    sendMessage({
      v: "1.0",
      id: createMessageId(),
      ts: nowIso(),
      source: "client",
      type: "agent.message.create",
      payload: {
        conversationId: conversationId.value,
        text,
      },
    });
  };

  const setExpression = (targetExpression: string) => {
    sendMessage({
      v: "1.0",
      id: createMessageId(),
      ts: nowIso(),
      source: "client",
      type: "pet.expression.set",
      payload: {
        expression: targetExpression,
        intensity: 0.8,
      },
    });
  };

  const playMotion = (targetMotion: string) => {
    sendMessage({
      v: "1.0",
      id: createMessageId(),
      ts: nowIso(),
      source: "client",
      type: "pet.motion.play",
      payload: {
        motion: targetMotion,
      },
    });
  };

  const speak = (text: string, options: SpeakOptions = {}) => {
    sendMessage({
      v: "1.0",
      id: createMessageId(),
      ts: nowIso(),
      source: "client",
      type: "tts.speak",
      payload: {
        conversationId: conversationId.value,
        text,
        ...options,
      },
    });
  };

  const applyCharacter = (options: CharacterApplyOptions) => {
    sendMessage({
      v: "1.0",
      id: createMessageId(),
      ts: nowIso(),
      source: "client",
      type: "session.character.apply",
      payload: {
        conversationId: conversationId.value,
        avatarId: options.avatarId,
        personaId: options.personaId,
        contextPolicy: options.contextPolicy || "keep",
        newConversationId: options.newConversationId,
        cancelOngoing: options.cancelOngoing,
      },
    });
  };

  const chooseRecorderMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
      "audio/ogg",
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  };

  const startVoiceInput = async (languageHint = "zh-CN") => {
    voiceError.value = "";
    if (!micSupported.value || isRecording.value) return;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      voiceError.value = "microphone permission denied";
      addLog("microphone permission denied");
      return;
    }

    const mimeType = chooseRecorderMimeType();
    try {
      recorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType, audioBitsPerSecond: 64_000 })
        : new MediaRecorder(mediaStream);
    } catch {
      voiceError.value = "media recorder init failed";
      addLog("media recorder init failed");
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
      return;
    }

    audioChunkSeq = 0;
    sendMessage({
      v: "1.0",
      id: createMessageId(),
      ts: nowIso(),
      source: "client",
      type: "audio.input.start",
      payload: {
        conversationId: conversationId.value,
        mimeType: recorder.mimeType || "audio/webm",
        languageHint,
      },
    });

    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return;
      const buffer = await event.data.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      sendMessage({
        v: "1.0",
        id: createMessageId(),
        ts: nowIso(),
        source: "client",
        type: "audio.input.chunk",
        payload: {
          conversationId: conversationId.value,
          sequence: audioChunkSeq,
          data: bytesToBase64(bytes),
        },
      });
      audioChunkSeq += 1;
    };

    recorder.onstop = () => {
      sendMessage({
        v: "1.0",
        id: createMessageId(),
        ts: nowIso(),
        source: "client",
        type: "audio.input.end",
        payload: {
          conversationId: conversationId.value,
        },
      });
      mediaStream?.getTracks().forEach((t) => t.stop());
      mediaStream = null;
      recorder = null;
      isRecording.value = false;
      addLog("voice input stopped");
    };

    recorder.start(240);
    isRecording.value = true;
    addLog(`voice input started (${recorder.mimeType || "audio/webm"})`);
  };

  const stopVoiceInput = () => {
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  };

  const toggleVoiceInput = async () => {
    if (isRecording.value) {
      stopVoiceInput();
      return;
    }
    await startVoiceInput();
  };

  onBeforeUnmount(() => {
    stopVoiceInput();
    disconnect();
  });

  return {
    state,
    sessionId,
    conversationId,
    activeAvatarId,
    activePersonaId,
    chatRows,
    logs,
    expression,
    motion,
    speaking,
    viseme,
    draftReply,
    isRecording,
    micSupported,
    isAudioPlaying,
    voiceError,
    connect,
    disconnect,
    sendChat,
    setExpression,
    playMotion,
    speak,
    applyCharacter,
    startVoiceInput,
    stopVoiceInput,
    toggleVoiceInput,
  };
};
