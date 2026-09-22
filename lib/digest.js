/**
 * Список записей на день для мастера в Telegram.
 *  - каждый день в 22:00 (по часовому поясу SITE.timezone) — записи на завтра;
 *  - в любое время — кнопками меню бота «Записи на сегодня» / «Записи на завтра».
 */
import { SERVICES, SCHEDULE, SITE, TELEGRAM, LANGUAGES, localize } from "../public/config.js";
import { partsInTz, addDays, formatDate, weekday, html, DIVIDER } from "./booking.js";
import { readCredentials, callTelegram } from "./telegram.js";
import { createStore } from "./store.js";

/** Постоянное меню внизу чата с ботом */
export const MENU = {
  today: "Записи на сегодня",
  tomorrow: "Записи на завтра",
  all: "Все записи",
};
export const MENU_KEYBOARD = {
  keyboard: [[{ text: MENU.today }, { text: MENU.tomorrow }], [{ text: MENU.all }]],
  resize_keyboard: true,
  is_persistent: true,
};

/** Час рассылки по местному времени */
export const DIGEST_HOUR = 22;

const plural = (n, [one, few, many]) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const localDates = () => {
  const today = partsInTz(SITE.timezone).date;
  return { today, tomorrow: addDays(today, 1) };
};

/** { "ЧЧ:ММ": JSON } → [{ time, service, name, ... }] по времени */
function parseBookings(byTime) {
  return Object.entries(byTime || {})
    .map(([time, raw]) => {
      try {
        return { time, ...JSON.parse(raw) };
      } catch {
        return { time };
      }
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

const serviceOf = (b) => SERVICES.find((s) => s.id === b.service);
const serviceName = (b) =>
  html(serviceOf(b) ? localize(serviceOf(b).name, TELEGRAM.lang || LANGUAGES.defaultLang) : "услуга не указана");
const money = (n) => `${n.toLocaleString("ru-RU")} ${localize(SITE.currency, TELEGRAM.lang || LANGUAGES.defaultLang)}`;

/**
 * Все предстоящие записи (с сегодняшнего дня), сгруппированные по дням.
 * Возвращает массив сообщений: у Telegram лимит 4096 символов на сообщение.
 */
export async function buildAllList(store) {
  const title = `<b>${html(MENU.all.toUpperCase())}</b>`;
  if (!store) return [`${title}\n${DIVIDER}\nБаза броней не подключена — список недоступен.`];

  const { today } = localDates();
  const dates = Array.from({ length: SCHEDULE.daysAhead + 1 }, (_, i) => addDays(today, i));
  const byDate = await store.listMany(dates);

  let count = 0;
  let total = 0;
  const days = [];
  for (const date of dates) {
    const bookings = parseBookings(byDate[date]);
    if (!bookings.length) continue;
    const label = date === today ? "сегодня" : date === addDays(today, 1) ? "завтра" : weekday(date);
    const lines = [`<b>${formatDate(date).slice(0, 5)}, ${label}</b>`];
    for (const b of bookings) {
      count++;
      total += serviceOf(b)?.price || 0;
      const who = [b.name, b.phone].filter(Boolean).map(html).join("  ·  ");
      const flags = [b.allergy && "аллергия", b.status !== "confirmed" && "ожидает подтверждения"].filter(Boolean);
      lines.push(`${b.time}  ${serviceName(b)}`);
      if (who || flags.length) lines.push(`      ${[who, ...flags.map((f) => `<i>${f}</i>`)].filter(Boolean).join("  ·  ")}`);
    }
    days.push(lines.join("\n"));
  }

  if (!days.length) return [`${title}\n${DIVIDER}\nПредстоящих записей нет.`];

  const footer = `${DIVIDER}\n<b>Итого:</b>  ${count} ${plural(count, ["запись", "записи", "записей"])}  ·  ${money(total)}`;
  const messages = [];
  let current = `${title}\n${DIVIDER}`;
  for (const day of days) {
    if ((current + "\n\n" + day).length > 3800) {
      messages.push(current);
      current = `${title} <i>(продолжение)</i>\n${DIVIDER}`;
    }
    current += "\n\n" + day;
  }
  messages.push(`${current}\n${footer}`);
  return messages;
}

/** Отправить все предстоящие записи в чат мастера */
export async function sendAllList(env) {
  const creds = readCredentials(env);
  if (!creds) return false;
  for (const text of await buildAllList(createStore(env))) {
    const ok = await callTelegram(creds, "sendMessage", {
      chat_id: creds.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: MENU_KEYBOARD,
    });
    if (!ok) return false;
  }
  return true;
}

/**
 * Текст списка записей на дату (parse_mode: "HTML").
 * @returns {Promise<string>}
 */
export async function buildDayList(date, store, title) {
  const lang = TELEGRAM.lang || LANGUAGES.defaultLang;
  const header = [`<b>${html(title.toUpperCase())}</b>`, `${formatDate(date)}, ${weekday(date)}`, DIVIDER];

  if (!store) {
    return [...header, "База броней не подключена — список недоступен.", "Vercel → Storage → Upstash Redis."].join("\n");
  }

  const bookings = parseBookings(await store.list(date));
  if (!bookings.length) return [...header, "Записей нет."].join("\n");

  let total = 0;
  const blocks = bookings.map((b) => {
    const service = SERVICES.find((s) => s.id === b.service);
    if (service) total += service.price;
    const lines = [`<b>${b.time}</b>  ·  ${html(service ? localize(service.name, lang) : "услуга не указана")}`];
    const contact = [b.name, b.phone].filter(Boolean).map(html).join("  ·  ");
    if (contact) lines.push(contact);
    if (b.telegram) lines.push(html(b.telegram));
    if (b.allergy) lines.push(`<b>Аллергия:</b>  <i>${html(b.allergy)}</i>`);
    lines.push(b.status === "confirmed" ? "Подтверждена" : "<b>Ожидает подтверждения</b>");
    return lines.join("\n");
  });

  const count = `${bookings.length} ${plural(bookings.length, ["запись", "записи", "записей"])}`;
  const sum = `${total.toLocaleString("ru-RU")} ${localize(SITE.currency, lang)}`;
  return [...header, blocks.join("\n\n"), DIVIDER, `<b>Итого:</b>  ${count}  ·  ${sum}`].join("\n");
}

/** Отправить список на дату в чат мастера */
export async function sendDayList(env, which) {
  const creds = readCredentials(env);
  if (!creds) return false;
  const dates = localDates();
  const text = await buildDayList(dates[which], createStore(env), MENU[which]);
  return Boolean(
    await callTelegram(creds, "sendMessage", {
      chat_id: creds.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: MENU_KEYBOARD,
    })
  );
}

/**
 * Ежедневная рассылка (GET /api/cron/digest — вызывается планировщиком Vercel).
 * Планировщик работает по UTC, а в часовом поясе мастера бывает летнее/зимнее время,
 * поэтому он запускается дважды (19:00 и 20:00 UTC), а отправляет только тот запуск,
 * у которого по местному времени сейчас 22 часа. Повторная отправка за день исключена.
 */
export async function handleDigestCron({ authorization, env }) {
  const secret = (env.CRON_SECRET || "").trim();
  if (secret && authorization !== `Bearer ${secret}`) return { status: 401, json: { ok: false } };

  const hour = Math.floor(partsInTz(SITE.timezone).minutes / 60);
  if (hour !== DIGEST_HOUR) return { status: 200, json: { ok: true, skipped: `местное время ${hour}:xx` } };

  const store = createStore(env);
  const { today } = localDates();
  if (store && !(await store.once(`digest:${today}`, 60 * 60 * 36).catch(() => true))) {
    return { status: 200, json: { ok: true, skipped: "уже отправлено сегодня" } };
  }

  const sent = await sendDayList(env, "tomorrow");
  return { status: sent ? 200 : 502, json: { ok: sent } };
}
