const { WebSocketServer } = require("ws");
const { randomUUID } = require("node:crypto");

const PORT = Number(process.env.MOCK_SERVER_PORT || 18765);
const PATH = process.env.MOCK_SERVER_PATH || "/ws";

const wss = new WebSocketServer({
  host: "127.0.0.1",
  port: PORT,
  path: PATH,
});

const petState = {
  expression: "idle",
  motion: "standby",
  speaking: false,
};

const voiceInputSessions = new WeakMap();
const characterSessions = new WeakMap();

const createEnvelope = (type, payload) => ({
  v: "1.0",
  id: randomUUID(),
  ts: new Date().toISOString(),
  source: "server",
  type,
  payload,
});

const send = (ws, type, payload) => {
  if (ws.readyState !== 1) return;
  ws.send(JSON.stringify(createEnvelope(type, payload)));
};

const broadcastPetState = () => {
  const packet = JSON.stringify(createEnvelope("pet.state", petState));
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(packet);
    }
  }
};

const getVoiceSessions = (ws) => {
  let sessions = voiceInputSessions.get(ws);
  if (!sessions) {
    sessions = new Map();
    voiceInputSessions.set(ws, sessions);
  }
  return sessions;
};

const getCharacterSession = (ws) => {
  let character = characterSessions.get(ws);
  if (!character) {
    character = {
      avatarId: "mao_pro_zh",
      personaId: "default",
    };
    characterSessions.set(ws, character);
  }
  return character;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeTtsConfig = (rawConfig) => {
  const speed = clamp(Number(rawConfig?.speed ?? 1), 0.6, 1.8);
  const pitch = clamp(Number(rawConfig?.pitch ?? 0), -8, 8);
  const volume = clamp(Number(rawConfig?.volume ?? 1), 0.2, 1.8);
  const sampleRate = clamp(Number(rawConfig?.sampleRate ?? 22_050), 16_000, 48_000);
  const voice = String(rawConfig?.voice || "cn_female_default");
  const format = rawConfig?.format === "mp3" || rawConfig?.format === "ogg" ? rawConfig.format : "wav";
  return { speed, pitch, volume, sampleRate, voice, format };
};

const buildSpeechLikeWav = (text, ttsConfig) => {
  const speed = ttsConfig.speed;
  const pitch = ttsConfig.pitch;
  const volume = ttsConfig.volume;
  const sampleRate = ttsConfig.sampleRate;
  const channels = 1;
  const bytesPerSample = 2;
  const charLen = Math.max(1, text.length);
  const durationMs = clamp(Math.round((950 + charLen * 34) / speed), 900, 6200);
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const dataBytes = sampleCount * bytesPerSample;
  const out = Buffer.alloc(44 + dataBytes);

  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(channels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  out.writeUInt16LE(channels * bytesPerSample, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataBytes, 40);

  const toneMap = [172, 196, 220, 248, 196, 172, 260, 186];
  const attack = Math.floor(sampleRate * 0.02);
  const release = Math.floor(sampleRate * 0.05);
  const charStep = Math.max(1, Math.floor(sampleCount / charLen));
  const pitchScale = 2 ** (pitch / 12);
  const gain = clamp(volume * 0.26, 0.1, 0.45);

  for (let i = 0; i < sampleCount; i += 1) {
    const charIndex = Math.min(charLen - 1, Math.floor(i / charStep));
    const charCode = text.charCodeAt(charIndex) || 65;
    const freq = toneMap[charCode % toneMap.length];
    const nextFreq = toneMap[(charCode + 3) % toneMap.length];
    const blend = (i % charStep) / charStep;
    const currentFreq = (freq * (1 - blend) + nextFreq * blend) * pitchScale;
    const t = i / sampleRate;
    const carrier = Math.sin(2 * Math.PI * currentFreq * t);
    const formant = 0.33 * Math.sin(2 * Math.PI * (currentFreq * 2.1) * t);

    let env = 1;
    if (i < attack) env = i / attack;
    if (i > sampleCount - release) env = (sampleCount - i) / release;

    const value = Math.round((carrier + formant) * env * gain * 32767);
    out.writeInt16LE(value, 44 + i * 2);
  }

  return {
    mimeType: "audio/wav",
    sampleRate,
    channels,
    durationMs,
    format: "wav",
    voice: ttsConfig.voice,
    speed: ttsConfig.speed,
    pitch: ttsConfig.pitch,
    volume: ttsConfig.volume,
    wavBuffer: out,
  };
};

const sendAudioOutput = (ws, conversationId, text, ttsConfigRaw = {}) => {
  const ttsConfig = normalizeTtsConfig(ttsConfigRaw);
  if (ttsConfig.format !== "wav") {
    send(ws, "error", {
      code: "UNSUPPORTED_AUDIO_FORMAT",
      message: `mock backend only returns wav; fallback from ${ttsConfig.format} to wav`,
    });
  }

  const audio = buildSpeechLikeWav(text, ttsConfig);
  const chunkSize = 8_192;
  const totalChunks = Math.ceil(audio.wavBuffer.length / chunkSize);

  petState.speaking = true;
  broadcastPetState();

  send(ws, "audio.output.start", {
    conversationId,
    mimeType: audio.mimeType,
    sampleRate: audio.sampleRate,
    channels: audio.channels,
    format: audio.format,
    voice: audio.voice,
    speed: audio.speed,
    pitch: audio.pitch,
    volume: audio.volume,
  });

  for (let i = 0; i < totalChunks; i += 1) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, audio.wavBuffer.length);
    const chunk = audio.wavBuffer.subarray(start, end);
    send(ws, "audio.output.chunk", {
      conversationId,
      sequence: i,
      data: chunk.toString("base64"),
    });
  }

  send(ws, "audio.output.end", {
    conversationId,
    totalChunks,
    durationMs: audio.durationMs,
  });

  setTimeout(() => {
    petState.speaking = false;
    petState.motion = "idle_bounce";
    broadcastPetState();
  }, audio.durationMs + 140);
};

const streamReply = (ws, conversationId, text, ttsConfig = {}) => {
  const reply =
    `I got your message: "${text}". ` +
    "This is a streamed response from the mock backend. Replace it with your OpenClaw proxy next.";

  const tokens = reply.split("");
  let index = 0;

  const timer = setInterval(() => {
    if (ws.readyState !== 1) {
      clearInterval(timer);
      return;
    }

    if (index >= tokens.length) {
      clearInterval(timer);
      send(ws, "agent.reply.done", {
        conversationId,
        fullText: reply,
      });
      sendAudioOutput(ws, conversationId, reply, ttsConfig);
      return;
    }

    send(ws, "agent.reply.delta", {
      conversationId,
      textDelta: tokens[index],
    });

    send(ws, "tts.viseme", {
      viseme: ["a", "i", "u", "e", "o", "sil"][index % 6],
      weight: Number((0.4 + ((index % 5) / 10)).toFixed(2)),
    });

    index += 1;
  }, 35);
};

const handleUserText = (ws, conversationId, text, ttsConfig = {}) => {
  petState.speaking = true;
  petState.motion = "thinking";
  broadcastPetState();
  streamReply(ws, conversationId, text, ttsConfig);
};

wss.on("connection", (ws) => {
  const sessionId = randomUUID();
  getVoiceSessions(ws);
  getCharacterSession(ws);

  send(ws, "server.ready", {
    sessionId,
    now: new Date().toISOString(),
    providers: ["mock-openclaw-proxy"],
  });

  broadcastPetState();

  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, "error", { code: "INVALID_JSON", message: "malformed JSON payload" });
      return;
    }

    if (!message || typeof message !== "object") return;
    const sessions = getVoiceSessions(ws);

    if (message.type === "hello") {
      return;
    }

    if (message.type === "pet.expression.set") {
      petState.expression = message.payload?.expression || "idle";
      broadcastPetState();
      return;
    }

    if (message.type === "pet.motion.play") {
      petState.motion = message.payload?.motion || "standby";
      broadcastPetState();
      return;
    }

    if (message.type === "session.character.apply") {
      const character = getCharacterSession(ws);
      const previousConversationId = message.payload?.conversationId || "demo-conversation";
      const contextPolicy = message.payload?.contextPolicy === "reset" ? "reset" : "keep";
      const nextConversationId =
        contextPolicy === "reset"
          ? message.payload?.newConversationId || `conv-${randomUUID()}`
          : previousConversationId;

      if (typeof message.payload?.avatarId === "string" && message.payload.avatarId.trim()) {
        character.avatarId = message.payload.avatarId.trim();
      }

      if (typeof message.payload?.personaId === "string" && message.payload.personaId.trim()) {
        character.personaId = message.payload.personaId.trim();
      }

      send(ws, "session.character.applied", {
        avatarId: character.avatarId,
        personaId: character.personaId,
        previousConversationId,
        conversationId: nextConversationId,
        contextPolicy,
        appliedAt: new Date().toISOString(),
      });

      send(ws, "pet.state", {
        expression: petState.expression,
        motion: "idle_bounce",
        speaking: false,
      });
      return;
    }

    if (message.type === "tts.speak") {
      sendAudioOutput(
        ws,
        message.payload?.conversationId || "demo-conversation",
        message.payload?.text || "empty",
        {
          voice: message.payload?.voice,
          speed: message.payload?.speed,
          pitch: message.payload?.pitch,
          volume: message.payload?.volume,
          sampleRate: message.payload?.sampleRate,
          format: message.payload?.format,
        },
      );
      return;
    }

    if (message.type === "agent.message.create") {
      handleUserText(
        ws,
        message.payload?.conversationId || "demo-conversation",
        message.payload?.text || "",
      );
      return;
    }

    if (message.type === "audio.input.start") {
      const conversationId = message.payload?.conversationId || "demo-conversation";
      sessions.set(conversationId, {
        mimeType: message.payload?.mimeType || "audio/webm",
        languageHint: message.payload?.languageHint || "zh-CN",
        chunks: [],
        totalBytes: 0,
      });
      return;
    }

    if (message.type === "audio.input.chunk") {
      const conversationId = message.payload?.conversationId || "demo-conversation";
      const session = sessions.get(conversationId);
      if (!session) return;
      const bytes = Buffer.from(message.payload?.data || "", "base64");
      session.chunks.push(bytes);
      session.totalBytes += bytes.length;
      return;
    }

    if (message.type === "audio.input.end") {
      const conversationId = message.payload?.conversationId || "demo-conversation";
      const session = sessions.get(conversationId);
      if (!session) return;
      const sizeKB = Math.max(1, Math.round(session.totalBytes / 1024));
      const transcript = `Voice message received (${sizeKB} KB). Please summarize my voice input.`;

      send(ws, "asr.result", {
        conversationId,
        text: transcript,
        confidence: 0.91,
        language: session.languageHint || "zh-CN",
      });

      sessions.delete(conversationId);
      handleUserText(ws, conversationId, transcript);
      return;
    }

    send(ws, "error", {
      code: "UNSUPPORTED_TYPE",
      message: `unsupported client message: ${String(message.type)}`,
    });
  });

  ws.on("close", () => {
    voiceInputSessions.delete(ws);
    characterSessions.delete(ws);
  });
});

console.log(`[mock-server] ws://127.0.0.1:${PORT}${PATH}`);
