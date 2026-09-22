/**
 * Обработка нажатий кнопок в Telegram (POST /api/telegram — webhook бота).
 *
 * Под каждой заявкой есть кнопка «Отменить запись». Сценарий в два шага,
 * чтобы случайное касание ничего не удалило:
 *   ask|дата|время    → «Точно отменить?»  [Да, освободить] [Нет]
 *   cancel|дата|время → время освобождается, сообщение помечается «Отменено»
 *   keep|дата|время   → возвращаем исходную кнопку
 *
 * Защита: Telegram присылает секретный заголовок (задаётся при регистрации webhook),
 * и нажатия принимаются только из чата мастера (TELEGRAM_CHAT_ID).
 */
import { timingSafeEqual } from "node:crypto";
import { readCredentials, callTelegram, webhookSecret } from "./telegram.js";
import { createStore } from "./store.js";
import { cancelKeyboard } from "./booking.js";

const CALLBACK = /^(ask|cancel|keep)\|(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})$/;
const CANCELLED_MARK = "\n\n❌ ЗАПИСЬ ОТМЕНЕНА — время снова свободно на сайте";

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * @param {object} update  тело запроса от Telegram
 * @param {{secretHeader?: string, env: object}} ctx
 */
export async function handleTelegramUpdate(update, { secretHeader, env }) {
  const creds = readCredentials(env);
  if (!creds) return { status: 500, json: { ok: false } };
  if (!secretHeader || !safeEqual(secretHeader, webhookSecret(creds.token))) {
    return { status: 403, json: { ok: false } };
  }

  const q = update?.callback_query;
  const match = CALLBACK.exec(q?.data || "");
  // Всегда отвечаем 200, иначе Telegram будет повторять запрос
  if (!q || !match) return { status: 200, json: { ok: true } };

  const [, action, date, time] = match;
  const message = q.message;
  const answer = (text) => callTelegram(creds, "answerCallbackQuery", { callback_query_id: q.id, text });

  if (String(message?.chat?.id) !== creds.chatId) {
    await answer("Нет доступа");
    return { status: 200, json: { ok: true } };
  }

  const target = { chat_id: message.chat.id, message_id: message.message_id };

  if (action === "ask") {
    await callTelegram(creds, "editMessageReplyMarkup", {
      ...target,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Да, отменить и освободить", callback_data: `cancel|${date}|${time}` },
            { text: "↩️ Нет", callback_data: `keep|${date}|${time}` },
          ],
        ],
      },
    });
    await answer("Точно отменить запись?");
  } else if (action === "keep") {
    await callTelegram(creds, "editMessageReplyMarkup", { ...target, reply_markup: cancelKeyboard(date, time) });
    await answer("Запись оставлена");
  } else {
    const store = createStore(env);
    if (!store) {
      await answer("База броней не подключена");
      return { status: 200, json: { ok: true } };
    }
    try {
      await store.release(date, time);
    } catch (err) {
      console.error("[store] Не удалось освободить время:", err.message);
      await answer("Ошибка базы, попробуйте ещё раз");
      return { status: 200, json: { ok: true } };
    }
    const text = (message.text || "").replace(CANCELLED_MARK, "") + CANCELLED_MARK;
    await callTelegram(creds, "editMessageText", { ...target, text, disable_web_page_preview: true });
    await answer(`Время ${time} освобождено`);
  }

  return { status: 200, json: { ok: true } };
}
