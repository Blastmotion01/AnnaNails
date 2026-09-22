/**
 * Подключает кнопку «Отменить запись» в Telegram к сайту.
 * Запуск (адрес вашего сайта на Vercel):
 *   npm run telegram:webhook -- https://anna-nails-alpha.vercel.app
 *
 * Отключить:  npm run telegram:webhook -- --off
 *
 * Токен бота берётся из .env и в консоль не выводится.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../lib/env.js";
import { readCredentials, callTelegram, webhookSecret } from "../lib/telegram.js";
import { MENU, MENU_KEYBOARD, DIGEST_HOUR } from "../lib/digest.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(path.join(ROOT, ".env"));

const arg = (process.argv[2] || "").trim();
const creds = readCredentials(process.env);
if (!creds) {
  console.log("\n  ✗ Сначала настройте бота: npm run telegram:setup\n");
  process.exit(1);
}

if (arg === "--off") {
  const ok = await callTelegram(creds, "deleteWebhook", {});
  console.log(ok ? "\n  ✓ Webhook отключён — кнопки в Telegram больше не работают\n" : "\n  ✗ Не удалось отключить\n");
  process.exit(ok ? 0 : 1);
}

let site;
try {
  site = new URL(arg);
  if (site.protocol !== "https:") throw new Error();
} catch {
  console.log("\n  Укажите адрес сайта (https), например:");
  console.log("    npm run telegram:webhook -- https://anna-nails-alpha.vercel.app\n");
  process.exit(1);
}

const url = `${site.origin}/api/telegram`;
const ok = await callTelegram(creds, "setWebhook", {
  url,
  secret_token: webhookSecret(creds.token),
  allowed_updates: ["callback_query", "message"],
  drop_pending_updates: true,
});
if (!ok) {
  console.log("\n  ✗ Telegram не принял адрес. Проверьте, что сайт открывается по этой ссылке.\n");
  process.exit(1);
}

// Команды в меню «/» бота
await callTelegram(creds, "setMyCommands", {
  commands: [
    { command: "today", description: MENU.today },
    { command: "tomorrow", description: MENU.tomorrow },
    { command: "all", description: MENU.all },
  ],
});

// Сообщение с постоянными кнопками меню внизу чата
await callTelegram(creds, "sendMessage", {
  chat_id: creds.chatId,
  text:
    "Меню записей подключено.\n\n" +
    `Кнопки внизу чата — «${MENU.today}», «${MENU.tomorrow}» и «${MENU.all}».\n` +
    `Каждый вечер в ${DIGEST_HOUR}:00 список на завтра будет приходить сам.`,
  reply_markup: MENU_KEYBOARD,
});

const info = await callTelegram(creds, "getWebhookInfo", {});
console.log(`\n  ✓ Кнопки заявок и меню записей подключены: ${url}`);
if (info?.last_error_message) console.log(`  ⚠ Последняя ошибка Telegram: ${info.last_error_message}`);
console.log("");
