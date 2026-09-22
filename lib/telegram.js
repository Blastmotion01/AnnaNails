/**
 * Работа с Telegram Bot API.
 * Токен и chat id читаются только из переменных окружения и никогда не логируются.
 */
import { createHash } from "node:crypto";

/**
 * Прощает типичные ошибки при вставке значения в панель хостинга:
 * пробелы/переносы, кавычки, случайно вставленное «ИМЯ=значение».
 */
function readSecret(env, name) {
  return String(env[name] ?? "")
    .trim()
    .replace(new RegExp(`^${name}\\s*=\\s*`), "")
    .replace(/^(['"])(.*)\1$/, "$2")
    .trim();
}

const TOKEN_FORMAT = /^\d{5,}:[A-Za-z0-9_-]{30,}$/;

/** Описание формата токена для логов — без раскрытия самого токена. */
function describeToken(token) {
  return [
    `длина ${token.length}`,
    token.includes(":") ? "двоеточие есть" : "НЕТ двоеточия",
    /^\d+$/.test(token) ? "состоит только из цифр — похоже, это chat id, а не токен" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/** @returns {{token: string, chatId: string} | null} */
export function readCredentials(env) {
  const token = readSecret(env, "TELEGRAM_BOT_TOKEN")
    .replace(/\s+/g, "") // токен не содержит пробелов и переносов
    .replace(/^bot(?=\d)/, ""); // скопирован вместе с «bot» из ссылки api.telegram.org/bot…
  const chatId = readSecret(env, "TELEGRAM_CHAT_ID").replace(/\s+/g, "");

  if (!token || !chatId) {
    console.error(
      `[telegram] Не заданы переменные окружения: ${[!token && "TELEGRAM_BOT_TOKEN", !chatId && "TELEGRAM_CHAT_ID"]
        .filter(Boolean)
        .join(", ")}. На Vercel: Settings → Environment Variables, затем Redeploy.`
    );
    return null;
  }
  if (!TOKEN_FORMAT.test(token)) {
    console.error(
      `[telegram] TELEGRAM_BOT_TOKEN не похож на токен бота (${describeToken(token)}). ` +
        "Ожидается вид 1234567890:AAH… из @BotFather. Проверьте, не перепутаны ли значения токена и chat id."
    );
    return null;
  }
  if (!/^-?\d+$/.test(chatId)) {
    console.error("[telegram] TELEGRAM_CHAT_ID должен быть числом (например 123456789 или -100123… для группы).");
    return null;
  }
  return { token, chatId };
}

/**
 * Вызов метода Bot API. Возвращает result или null при ошибке.
 * Текст всегда уходит БЕЗ parse_mode — пользовательский ввод не может внедрить разметку/ссылки.
 */
export async function callTelegram({ token }, method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      console.error(`[telegram] ${method}: ${res.status} ${json.description || ""}`);
      return null;
    }
    return json.result;
  } catch (err) {
    console.error(`[telegram] ${method}: запрос не удался (${err.name}: ${err.message})`);
    return null;
  }
}

/**
 * Секрет для проверки, что запрос на /api/telegram пришёл именно от Telegram.
 * Выводится из токена бота, поэтому отдельная переменная окружения не нужна.
 */
export function webhookSecret(token) {
  return createHash("sha256").update(`webhook:${token}`).digest("hex");
}
