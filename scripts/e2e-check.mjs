import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "e2e");
const WEB_URL = "http://127.0.0.1:5173";

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHttp = async (url, timeoutMs = 45_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await sleep(400);
  }
  throw new Error(`timeout waiting for ${url}`);
};

const spawnProc = (script) => {
  const child = spawn("cmd.exe", ["/c", `npm run ${script}`], {
    cwd: ROOT,
    env: process.env,
    shell: false,
    stdio: "pipe",
  });

  child.stdout.on("data", (buf) => {
    process.stdout.write(`[${script}] ${buf}`);
  });
  child.stderr.on("data", (buf) => {
    process.stderr.write(`[${script}] ${buf}`);
  });
  return child;
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

const killProcess = (child) => {
  if (!child || child.killed) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
};

const main = async () => {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const web = spawnProc("dev:web");
  const backend = spawnProc("dev:backend");

  let browser;
  try {
    await waitForHttp(WEB_URL);

    const executablePath = await resolveChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 980 });
    await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector(".shell", { timeout: 20_000 });

    await page.waitForSelector(".live2d-canvas", { timeout: 20_000 });
    await page.waitForFunction(
      () => {
        const overlay = document.querySelector(".live2d-overlay");
        return !overlay;
      },
      { timeout: 25_000 },
    );

    const shot1 = path.join(ARTIFACT_DIR, "01-live2d-loaded.png");
    await page.screenshot({ path: shot1, fullPage: true });

    await page.evaluate(() => {
      const clickByText = (text) => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const hit = buttons.find((btn) => btn.textContent?.trim() === text);
        if (hit) {
          hit.click();
        }
      };
      clickByText("Joy");
      clickByText("Wave");
    });
    await sleep(800);
    const shot2 = path.join(ARTIFACT_DIR, "02-motion-expression.png");
    await page.screenshot({ path: shot2, fullPage: true });

    await page.click("input[placeholder*='Send a message']");
    await page.keyboard.type("E2E check: can you respond?");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const send = buttons.find((btn) => btn.textContent?.trim() === "Send");
      if (send) {
        send.click();
      }
    });
    await page.waitForFunction(
      () => {
        const assistant = document.querySelectorAll(".chat-row.assistant");
        return assistant.length > 0;
      },
      { timeout: 20_000 },
    );
    await sleep(500);
    const shot3 = path.join(ARTIFACT_DIR, "03-dialogue-done.png");
    await page.screenshot({ path: shot3, fullPage: true });

    const checks = await page.evaluate(() => {
      const statusNode = document.querySelector(".status-area span:last-child");
      const state = statusNode ? statusNode.innerText : "";
      const expression = Array.from(document.querySelectorAll(".pet-state span"))
        .map((n) => n.textContent || "")
        .find((t) => t.startsWith("Expression:"));
      const motion = Array.from(document.querySelectorAll(".pet-state span"))
        .map((n) => n.textContent || "")
        .find((t) => t.startsWith("Motion:"));
      const assistantCount = document.querySelectorAll(".chat-row.assistant").length;
      return { state, expression, motion, assistantCount };
    });

    console.log("\nE2E_RESULT", JSON.stringify({ checks, shots: [shot1, shot2, shot3] }, null, 2));
  } finally {
    if (browser) {
      await browser.close();
    }
    killProcess(web);
    killProcess(backend);
  }
};

main().catch((error) => {
  console.error("\nE2E_FAILED", error);
  process.exit(1);
});
