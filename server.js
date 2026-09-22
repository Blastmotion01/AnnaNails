/**
 * Локальный сервер без зависимостей (Node.js 18+).
 *  - раздаёт статические файлы из папки public/
 *  - обрабатывает POST /api/booking (та же логика, что и на Vercel)
 *  - читает секреты из файла .env
 *
 * Запуск: npm start  →  http://localhost:3000
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleBooking, handleSlots } from "./lib/booking.js";
import { handleTelegramUpdate } from "./lib/telegram-webhook.js";
import { createStore } from "./lib/store.js";
import { loadEnv } from "./lib/env.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");

loadEnv(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function readBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, code: "invalid_request" });
  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    return sendJson(res, 415, { ok: false, code: "invalid_request" });
  }
  try {
    return JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { ok: false, code: "invalid_request" });
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, "http://localhost");
  let result;

  if (url.pathname === "/api/slots") {
    if (req.method !== "GET") return sendJson(res, 405, { ok: false, code: "invalid_request" });
    result = await handleSlots(Object.fromEntries(url.searchParams), { env: process.env });
  } else if (url.pathname === "/api/booking") {
    const body = await readJson(req, res);
    if (res.writableEnded) return;
    result = await handleBooking(body, { ip: req.socket.remoteAddress, env: process.env });
  } else if (url.pathname === "/api/telegram") {
    const body = await readJson(req, res);
    if (res.writableEnded) return;
    result = await handleTelegramUpdate(body, {
      secretHeader: req.headers["x-telegram-bot-api-secret-token"],
      env: process.env,
    });
  } else {
    return sendJson(res, 404, { ok: false });
  }
  sendJson(res, result.status, result.json);
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  // Защита от выхода за пределы папки public (../)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  try {
    if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath, "index.html");
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

http
  .createServer((req, res) => {
    if (req.url.startsWith("/api/")) return handleApi(req, res);
    return serveStatic(req, res);
  })
  .listen(PORT, () => {
    const configured = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID;
    console.log(`\n  ✿ Сайт запущен: http://localhost:${PORT}`);
    console.log(
      configured
        ? "  ✓ Telegram настроен — заявки будут приходить в бот\n"
        : "  ⚠ Telegram не настроен — заявки НЕ будут доставлены.\n    Запустите: npm run telegram:setup\n"
    );
    const store = createStore(process.env);
    console.log(
      store?.kind === "redis"
        ? "  ✓ Учёт броней: база Upstash Redis\n"
        : "  ⓘ Учёт броней: в памяти (сбрасывается при перезапуске). Для постоянного — подключите Upstash Redis\n"
    );
  });
