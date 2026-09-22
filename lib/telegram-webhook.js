/**
 * Обработка кнопок под заявками в Telegram (POST /api/telegram — webhook бота).
 *
 * Новая заявка:          [✅ Подтвердить] [❌ Отменить]
 *   confirm|дата|время → «✅ ЗАПИСЬ ПОДТВЕРЖДЕНА», остаётся кнопка [❌ Отменить]
 *   ask|дата|время     → «Точно отменить?»  [Да, отменить] [Нет]
 *   cancel|дата|время  → «❌ ЗАПИСЬ ОТМЕНЕНА», время снова свободно на сайте, кнопки убираются
 *   keep|дата|время    → возвращаем прежние кнопки
 *
 * Защита: Telegram присылает секретный заголовок (задаётся при регистрации webhook),
 * и нажатия принимаются только из чата мастера (TELEGRAM_CHAT_ID).
 */
import { timingSafeEqual } from "node:crypto";
import { readCredentials, callTelegram, webhookSecret } from "./telegram.js";
import { createStore } from "./store.js";
import { bookingKeyboard, DIVIDER } from "./booking.js";

const CALLBACK = /^(confirm|ask|cancel|keep)\|(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})$/;
const MARK = {
  confirmed: "СТАТУС: ПОДТВЕРЖДЕНА",
  cancelledFreed: "СТАТУС: ОТМЕНЕНА · время снова свободно на сайте",
  cancelled: "СТАТУС: ОТМЕНЕНА",
};

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Текст заявки со статусом внизу. Форматирование (жирный и т.д.) сохраняется через
 * entities исходного сообщения: статус дописывается в конец, поэтому смещения не меняются.
 */
function withMark(message, mark) {
  let text = message.text || "";
  for (const m of Object.values(MARK)) {
    const suffix = `\n${DIVIDER}\n${m}`;
    if (text.endsWith(suffix)) text = text.slice(0, -suffix.length);
  }
  const entities = (message.entities || []).filter((e) => e.offset + e.length <= text.length);
  if (!mark) return { text, entities };
  const offset = text.length + DIVIDER.length + 2;
  return {
    text: `${text}\n${DIVIDER}\n${mark}`,
    entities: [...entities, { type: "bold", offset, length: mark.split(" · ")[0].length }],
  };
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
  const confirmed = (message.text || "").endsWith(MARK.confirmed);

  if (action === "confirm") {
    await callTelegram(creds, "editMessageText", {
      ...target,
      ...withMark(message, MARK.confirmed),
      disable_web_page_preview: true,
      reply_markup: bookingKeyboard(date, time, { confirmed: true }),
    });
    await answer("Запись подтверждена");
  } else if (action === "ask") {
    await callTelegram(creds, "editMessageReplyMarkup", {
      ...target,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Да, отменить", callback_data: `cancel|${date}|${time}` },
            { text: "↩️ Нет", callback_data: `keep|${date}|${time}` },
          ],
        ],
      },
    });
    await answer("Точно отменить запись?");
  } else if (action === "keep") {
    await callTelegram(creds, "editMessageReplyMarkup", {
      ...target,
      reply_markup: bookingKeyboard(date, time, { confirmed }),
    });
    await answer("Запись оставлена");
  } else {
    // Отмена: освобождаем время (если база подключена) и помечаем заявку
    const store = createStore(env);
    if (store) {
      try {
        await store.release(date, time);
      } catch (err) {
        console.error("[store] Не удалось освободить время:", err.message);
        await answer("Ошибка базы, попробуйте ещё раз");
        return { status: 200, json: { ok: true } };
      }
    }
    await callTelegram(creds, "editMessageText", {
      ...target,
      ...withMark(message, store ? MARK.cancelledFreed : MARK.cancelled),
      disable_web_page_preview: true,
    });
    await answer(store ? `Отменено, время ${time} свободно` : "Запись отменена");
  }

  return { status: 200, json: { ok: true } };
}
