/**
 * Помощник подключения Telegram-бота.
 * Запуск: npm run telegram:setup
 *
 * Что делает:
 *  1. Создаёт .env из .env.example, если его ещё нет.
 *  2. Проверяет токен бота (TELEGRAM_BOT_TOKEN).
 *  3. Если TELEGRAM_CHAT_ID не задан — находит его сам по последним
 *     сообщениям боту и записывает в .env.
 *  4. Отправляет тестовое сообщение в этот чат.
 *
 * Токен в консоль не выводится.
 */
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../lib/env.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env");
const EXAMPLE_FILE = path.join(ROOT, ".env.example");

const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ⚠ ${msg}`);
const info = (msg = "") => console.log(`    ${msg}`);

function fail(msg, ...hints) {
  console.log(`\n  ✗ ${msg}`);
  hints.forEach((h) => info(h));
  console.log("");
  process.exit(1);
}

async function tg(token, method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(15000),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, description: `нет связи с api.telegram.org (${err.message})` };
  }
}

function setEnvValue(key, value) {
  let text = readFileSync(ENV_FILE, "utf8");
  const re = new RegExp(`^\\s*#?\\s*${key}\\s*=.*$`, "m");
  text = re.test(text) ? text.replace(re, `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`;
  writeFileSync(ENV_FILE, text, "utf8");
}

const isPlaceholder = (v) => !v || /Example|^123456789$|^1234567890:/.test(v);

console.log("\n  Подключение Telegram-бота\n");

/* 1. Файл .env */
if (!existsSync(ENV_FILE)) {
  copyFileSync(EXAMPLE_FILE, ENV_FILE);
  setEnvValue("TELEGRAM_BOT_TOKEN", "");
  setEnvValue("TELEGRAM_CHAT_ID", "");
  ok("Создан файл .env");
}
loadEnv(ENV_FILE);

/* 2. Токен */
const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
if (isPlaceholder(token)) {
  fail(
    "В файле .env не указан токен бота.",
    "1. В Telegram откройте @BotFather → /newbot → получите токен.",
    "2. Откройте файл .env в папке проекта и впишите:",
    "     TELEGRAM_BOT_TOKEN=ваш_токен",
    "3. Напишите своему боту любое сообщение (нажмите Start).",
    "4. Снова запустите: npm run telegram:setup"
  );
}

const me = await tg(token, "getMe");
if (!me.ok) {
  fail(
    `Токен не подошёл: ${me.description}`,
    "Проверьте, что токен скопирован из @BotFather полностью, без пробелов и кавычек."
  );
}
ok(`Бот найден: @${me.result.username}`);

/* 3. Chat id */
let chatId = (process.env.TELEGRAM_CHAT_ID || "").trim();
if (isPlaceholder(chatId)) {
  const updates = await tg(token, "getUpdates", { limit: 100 });
  if (!updates.ok) {
    fail(
      `Не удалось получить сообщения боту: ${updates.description}`,
      "Если у бота настроен webhook, укажите TELEGRAM_CHAT_ID в .env вручную."
    );
  }

  const chats = new Map();
  for (const u of updates.result) {
    const chat = (u.message || u.edited_message || u.channel_post || u.my_chat_member)?.chat;
    if (chat) chats.set(chat.id, chat);
  }

  if (chats.size === 0) {
    fail(
      "Бот ещё не получил ни одного сообщения, поэтому я не знаю, куда слать заявки.",
      `Откройте https://t.me/${me.result.username}, нажмите Start или напишите «привет»,`,
      "затем снова запустите: npm run telegram:setup"
    );
  }

  const list = [...chats.values()];
  const describe = (c) =>
    c.type === "private"
      ? `личный чат с ${[c.first_name, c.last_name].filter(Boolean).join(" ")}${c.username ? ` (@${c.username})` : ""}`
      : `${c.type === "channel" ? "канал" : "группа"} «${c.title}»`;

  if (list.length > 1) {
    warn("Бот видит несколько чатов. Выберите, куда слать заявки, и впишите id в .env:");
    list.forEach((c) => info(`TELEGRAM_CHAT_ID=${c.id}   ← ${describe(c)}`));
    console.log("");
    process.exit(1);
  }

  chatId = String(list[0].id);
  setEnvValue("TELEGRAM_CHAT_ID", chatId);
  ok(`Чат найден и записан в .env: ${describe(list[0])}`);
}

/* 4. Тестовое сообщение */
const sent = await tg(token, "sendMessage", {
  chat_id: chatId,
  text: "✅ Бот подключён к сайту.\nНовые заявки на запись будут приходить сюда.",
});
if (!sent.ok) {
  fail(
    `Тестовое сообщение не отправилось: ${sent.description}`,
    /chat not found/i.test(sent.description)
      ? "Неверный TELEGRAM_CHAT_ID, или вы ещё не написали боту. Очистите TELEGRAM_CHAT_ID в .env и запустите снова."
      : /blocked/i.test(sent.description)
        ? "Вы заблокировали бота. Разблокируйте его в Telegram и запустите снова."
        : "Проверьте TELEGRAM_CHAT_ID в .env."
  );
}
ok("Тестовое сообщение отправлено — проверьте Telegram.");

console.log("\n  Готово! Перезапустите сайт (Ctrl+C, затем npm start),");
console.log("  и каждая новая заявка будет приходить вам в бот.");
console.log("  На Vercel добавьте те же TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в Environment Variables.\n");
