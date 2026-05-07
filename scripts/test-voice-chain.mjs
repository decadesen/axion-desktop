import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import { WebSocket } from "ws";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "voice-test");

const WS_PORT = Number(process.env.TEST_WS_PORT || 18767);
const WS_PATH = process.env.TEST_WS_PATH || "/ws";
const WS_URL = `ws://127.0.0.1:${WS_PORT}${WS_PATH}`;
const WEB_PORT = Number(process.env.TEST_WEB_PORT || 5179);
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createClientEnvelope = (type, payload) => ({
  v: "1.0",
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  ts: new Date().toISOString(),
  source: "client",
  type,
  payload,
});

const waitForHttp = async (url, timeoutMs = 45_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await sleep(350);
  }
  throw new Error(`timeout waiting for ${url}`);
};

const waitForWsListening = async (url, timeoutMs = 20_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.once("open", () => {
          ws.close();
          resolve(true);
        });
        ws.once("error", reject);
      });
      return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`timeout waiting for websocket server ${url}`);
};

const resolveChrome = async () => {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("No chrome/edge executable found. Set CHROME_PATH.");
};

const spawnNodeProcess = (name, args, extraEnv = {}) => {
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: "pipe",
    shell: false,
  });

  child.stdout.on("data", (buf) => process.stdout.write(`[${name}] ${buf}`));
  child.stderr.on("data", (buf) => process.stderr.write(`[${name}] ${buf}`));
  return child;
};

const killProcess = (child) => {
  if (!child || child.killed) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
};

const connectTestSocket = async (url) => {
  const ws = new WebSocket(url);
  const backlog = [];
  const waiters = [];

  ws.on("message", (raw) => {
    let parsed;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return;
    }

    for (let i = 0; i < waiters.length; i += 1) {
      const waiter = waiters[i];
      if (waiter.predicate(parsed)) {
        waiters.splice(i, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(parsed);
        return;
      }
    }
    backlog.push(parsed);
  });

  ws.on("close", () => {
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("socket closed"));
    }
    waiters.length = 0;
  });

  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  const waitFor = (predicate, timeoutMs = 15_000) => {
    const idx = backlog.findIndex((msg) => predicate(msg));
    if (idx >= 0) {
      return Promise.resolve(backlog.splice(idx, 1)[0]);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const target = waiters.findIndex((item) => item.resolve === resolve);
        if (target >= 0) waiters.splice(target, 1);
        reject(new Error(`timeout waiting message (${timeoutMs}ms)`));
      }, timeoutMs);

      waiters.push({ predicate, resolve, reject, timer });
    });
  };

  const send = (type, payload) => {
    ws.send(JSON.stringify(createClientEnvelope(type, payload)));
  };

  return { ws, waitFor, send };
};

const collectAudioOutput = async (socket, conversationId) => {
  const start = await socket.waitFor(
    (msg) => msg.type === "audio.output.start" && msg.payload?.conversationId === conversationId,
    20_000,
  );

  const chunks = [];
  let end = null;
  while (!end) {
    const message = await socket.waitFor(
      (msg) =>
        msg.payload?.conversationId === conversationId &&
        (msg.type === "audio.output.chunk" || msg.type === "audio.output.end"),
      25_000,
    );
    if (message.type === "audio.output.chunk") {
      chunks.push(message.payload);
    }
    if (message.type === "audio.output.end") {
      end = message;
    }
  }

  assert(chunks.length > 0, `no audio chunks for ${conversationId}`);
  const sortedChunks = [...chunks].sort((a, b) => a.sequence - b.sequence);
  const audioBuffer = Buffer.concat(sortedChunks.map((item) => Buffer.from(item.data, "base64")));

  assert(audioBuffer.length > 44, `audio too small for ${conversationId}`);
  assert(audioBuffer.subarray(0, 4).toString("ascii") === "RIFF", `invalid RIFF header for ${conversationId}`);
  assert(audioBuffer.subarray(8, 12).toString("ascii") === "WAVE", `invalid WAVE header for ${conversationId}`);
  assert(start.payload?.mimeType === "audio/wav", `unexpected mimeType: ${start.payload?.mimeType}`);
  assert(end.payload?.totalChunks === chunks.length, `chunk count mismatch for ${conversationId}`);

  return {
    conversationId,
    mimeType: start.payload?.mimeType,
    startPayload: start.payload,
    chunkCount: chunks.length,
    durationMs: end.payload?.durationMs,
    bytes: audioBuffer.length,
  };
};

const runProtocolVoiceTest = async () => {
  const socket = await connectTestSocket(WS_URL);
  try {
    await socket.waitFor((msg) => msg.type === "server.ready", 15_000);
    socket.send("hello", {
      client: "voice-test",
      sessionId: `test-${Date.now()}`,
      capabilities: ["chat", "audio_input", "audio_output"],
    });

    const characterBaseConversationId = `char-${Date.now()}`;
    socket.send("session.character.apply", {
      conversationId: characterBaseConversationId,
      avatarId: "mao_pro_zh",
      personaId: "assistant_warm",
      contextPolicy: "keep",
    });
    const characterKeep = await socket.waitFor(
      (msg) =>
        msg.type === "session.character.applied" &&
        msg.payload?.previousConversationId === characterBaseConversationId &&
        msg.payload?.contextPolicy === "keep",
      15_000,
    );
    assert(
      characterKeep.payload?.conversationId === characterBaseConversationId,
      "character keep policy returned different conversationId",
    );

    const characterResetConversationId = `${characterBaseConversationId}-reset`;
    socket.send("session.character.apply", {
      conversationId: characterBaseConversationId,
      avatarId: "hero_alt",
      personaId: "assistant_formal",
      contextPolicy: "reset",
      newConversationId: characterResetConversationId,
    });
    const characterReset = await socket.waitFor(
      (msg) =>
        msg.type === "session.character.applied" &&
        msg.payload?.previousConversationId === characterBaseConversationId &&
        msg.payload?.contextPolicy === "reset",
      15_000,
    );
    assert(
      characterReset.payload?.conversationId === characterResetConversationId,
      "character reset policy did not switch conversationId",
    );

    const conversationId = `voice-${Date.now()}`;
    const fakeMicBytes = Buffer.from("00112233445566778899aabbccddeeff11223344", "hex");
    const chunks = [fakeMicBytes.subarray(0, 8), fakeMicBytes.subarray(8, 16), fakeMicBytes.subarray(16)];

    socket.send("audio.input.start", {
      conversationId,
      mimeType: "audio/webm;codecs=opus",
    });
    chunks.forEach((chunk, index) => {
      socket.send("audio.input.chunk", {
        conversationId,
        sequence: index,
        data: chunk.toString("base64"),
      });
    });
    socket.send("audio.input.end", { conversationId });

    const asr = await socket.waitFor(
      (msg) => msg.type === "asr.result" && msg.payload?.conversationId === conversationId,
      20_000,
    );
    assert(asr.payload?.text?.includes("Voice message received"), "ASR result text missing expected marker");
    assert(asr.payload?.confidence >= 0.5, "ASR confidence unexpectedly low");

    const audioFromVoice = await collectAudioOutput(socket, conversationId);

    const chatConversationId = `chat-${Date.now()}`;
    socket.send("agent.message.create", {
      conversationId: chatConversationId,
      text: "voice chain test from text path",
    });
    await socket.waitFor(
      (msg) => msg.type === "agent.reply.done" && msg.payload?.conversationId === chatConversationId,
      25_000,
    );
    const audioFromChat = await collectAudioOutput(socket, chatConversationId);

    const ttsConversationId = `tts-${Date.now()}`;
    socket.send("tts.speak", {
      conversationId: ttsConversationId,
      text: "this is a tts configuration verification",
      voice: "cn_female_test",
      speed: 1.2,
      pitch: 2,
      volume: 1.1,
      sampleRate: 24_000,
      format: "wav",
    });
    const audioFromTtsSpeak = await collectAudioOutput(socket, ttsConversationId);
    assert(audioFromTtsSpeak.startPayload?.voice === "cn_female_test", "tts voice not applied");
    assert(Number(audioFromTtsSpeak.startPayload?.speed) === 1.2, "tts speed not applied");
    assert(Number(audioFromTtsSpeak.startPayload?.pitch) === 2, "tts pitch not applied");
    assert(Number(audioFromTtsSpeak.startPayload?.volume) === 1.1, "tts volume not applied");
    assert(Number(audioFromTtsSpeak.startPayload?.sampleRate) === 24_000, "tts sampleRate not applied");

    return {
      characterKeep: characterKeep.payload,
      characterReset: characterReset.payload,
      asrText: asr.payload.text,
      audioFromVoice,
      audioFromChat,
      audioFromTtsSpeak,
    };
  } finally {
    socket.ws.close();
  }
};

const runUiPlaybackTest = async () => {
  const executablePath = await resolveChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--autoplay-policy=no-user-gesture-required"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector(".shell", { timeout: 20_000 });

    await page.waitForFunction(
      () => {
        const status = document.querySelector(".status-area span:last-child");
        return status?.textContent?.trim() === "Connected";
      },
      { timeout: 20_000 },
    );

    await page.click("input[placeholder*='Send a message']");
    await page.keyboard.type("UI playback verification message");
    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.trim() === "Send",
      );
      sendBtn?.click();
    });

    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll(".meta span")).some((node) =>
          (node.textContent || "").includes("AudioOut: PLAYING"),
        ),
      { timeout: 30_000 },
    );

    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll(".meta span")).some((node) =>
          (node.textContent || "").includes("AudioOut: IDLE"),
        ) && document.querySelectorAll(".chat-row.assistant").length > 0,
      { timeout: 40_000 },
    );

    const logChecks = await page.evaluate(() => {
      const logTexts = Array.from(document.querySelectorAll(".logs li span")).map((n) => n.textContent || "");
      return {
        hasAudioStart: logTexts.includes("audio.output.start"),
        hasAudioEnd: logTexts.includes("audio.output.end"),
        assistantRows: document.querySelectorAll(".chat-row.assistant").length,
      };
    });

    assert(logChecks.hasAudioStart, "UI log missing audio.output.start");
    assert(logChecks.hasAudioEnd, "UI log missing audio.output.end");
    assert(logChecks.assistantRows > 0, "UI chat missing assistant response");

    const screenshotPath = path.join(ARTIFACT_DIR, "voice-ui-playback.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return { screenshotPath, ...logChecks };
  } finally {
    await browser.close();
  }
};

const main = async () => {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  let backend;
  let web;
  try {
    backend = spawnNodeProcess("backend", ["mock-server/server.cjs"], {
      MOCK_SERVER_PORT: String(WS_PORT),
      MOCK_SERVER_PATH: WS_PATH,
    });
    await waitForWsListening(WS_URL, 20_000);

    const protocolResult = await runProtocolVoiceTest();

    web = spawnNodeProcess(
      "web",
      ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(WEB_PORT)],
      {
        VITE_WS_URL: WS_URL,
        VITE_USE_MOCK_BACKEND: "true",
      },
    );
    await waitForHttp(WEB_URL, 45_000);

    const uiResult = await runUiPlaybackTest();

    console.log(
      "\nVOICE_TEST_RESULT",
      JSON.stringify(
        {
          protocolResult,
          uiResult,
        },
        null,
        2,
      ),
    );
  } finally {
    killProcess(web);
    killProcess(backend);
    await sleep(250);
  }
};

main().catch((error) => {
  console.error("\nVOICE_TEST_FAILED", error);
  process.exit(1);
});
