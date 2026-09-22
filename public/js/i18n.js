/**
 * Переводы интерфейса (кнопки, подписи, ошибки).
 * Тексты про салон, услуги и контакты — в config.js.
 *
 * В HTML:  data-i18n="ключ"               → textContent
 *          data-i18n-html="ключ"          → innerHTML (только для текстов из этого файла)
 *          data-i18n-placeholder="ключ"   → placeholder
 *          data-i18n-aria="ключ"          → aria-label
 */
import { LANGUAGES } from "../config.js";

const DICT = {
  ru: {
    "meta.title": "{name} — онлайн-запись",
    "meta.description": "Онлайн-запись на маникюр и педикюр",
    "lang.label": "Язык сайта",
    "hero.cta": "Записаться",
    "features.aria": "Преимущества",

    "booking.eyebrow": "Онлайн-запись",
    "booking.title": "Выберите удобное время",
    "booking.sub": 'Поля со звёздочкой <span class="req">*</span> обязательны',

    "step.service": "Услуга",
    "step.datetime": "Дата и время",
    "step.contacts": "Ваши данные",

    "service.label": "Что будем делать?",
    "service.placeholder": "Выберите услугу",
    "price.label": "Стоимость",
    "price.hint": "Выберите услугу, чтобы увидеть цену",

    "date.label": "Дата",
    "time.label": "Время",
    "slots.empty": "Сначала выберите дату",
    "cal.prev": "Предыдущий месяц",
    "cal.next": "Следующий месяц",
    "cal.unavailable": "недоступно",

    "allergy.title": "Есть аллергия",
    "allergy.sub": "На материалы, препараты или средства",
    "allergy.label": "Опишите аллергию",
    "allergy.placeholder": "Например: реакция на акрилаты",
    "name.label": "Имя",
    "name.placeholder": "Как к вам обращаться",
    "phone.label": "Телефон",
    "telegram.label": "Telegram",
    "optional": "необязательно",

    "summary": "Вы записываетесь на <strong>{service}</strong><br><strong>{date}</strong> в <strong>{time}</strong> · <strong>{price}</strong>",
    "submit": "Записаться",

    "success.title": "Спасибо!",
    "success.text": "Ваша заявка отправлена. Мы свяжемся с вами для подтверждения записи.",
    "success.again": "Новая запись",
    "row.service": "Услуга",
    "row.date": "Дата",
    "row.time": "Время",
    "row.price": "Стоимость",

    "modal.eyebrow": "Заявка создана",
    "modal.title": "Спасибо!",
    "modal.text": "Мы вам перезвоним для уточнения записи.",
    "modal.ok": "Хорошо",
    "modal.close": "Закрыть",

    "footer.contacts": "Связаться с нами",
    "footer.call": "Позвонить",

    "err.service_required": "Выберите услугу",
    "err.date_required": "Выберите дату",
    "err.date_unavailable": "На эту дату запись недоступна",
    "err.time_required": "Выберите время",
    "err.time_need_date": "Сначала выберите дату, затем время",
    "err.time_unavailable": "Это время недоступно, выберите другое",
    "err.allergy_required": "Опишите, пожалуйста, аллергию",
    "err.name_required": "Введите имя",
    "err.name_format": "Имя может содержать только буквы (минимум 2)",
    "err.phone_required": "Введите номер телефона",
    "err.phone_format": "Номер должен быть в формате +380 XX XXX XX XX",
    "err.telegram_format": "Username: 5–32 символа, латиница, цифры и _",

    "err.validation": "Проверьте заполнение формы",
    "err.invalid_request": "Некорректный запрос. Обновите страницу и попробуйте ещё раз.",
    "err.rate_limited": "Слишком много заявок подряд. Попробуйте чуть позже.",
    "err.send_failed": "Не удалось отправить заявку. Попробуйте ещё раз через минуту или свяжитесь с нами по телефону.",
    "err.network": "Нет соединения с сервером. Проверьте интернет и попробуйте ещё раз.",
  },

  uk: {
    "meta.title": "{name} — онлайн-запис",
    "meta.description": "Онлайн-запис на манікюр і педикюр",
    "lang.label": "Мова сайту",
    "hero.cta": "Записатися",
    "features.aria": "Переваги",

    "booking.eyebrow": "Онлайн-запис",
    "booking.title": "Оберіть зручний час",
    "booking.sub": 'Поля із зірочкою <span class="req">*</span> обовʼязкові',

    "step.service": "Послуга",
    "step.datetime": "Дата і час",
    "step.contacts": "Ваші дані",

    "service.label": "Що будемо робити?",
    "service.placeholder": "Оберіть послугу",
    "price.label": "Вартість",
    "price.hint": "Оберіть послугу, щоб побачити ціну",

    "date.label": "Дата",
    "time.label": "Час",
    "slots.empty": "Спочатку оберіть дату",
    "cal.prev": "Попередній місяць",
    "cal.next": "Наступний місяць",
    "cal.unavailable": "недоступно",

    "allergy.title": "Є алергія",
    "allergy.sub": "На матеріали, препарати чи засоби",
    "allergy.label": "Опишіть алергію",
    "allergy.placeholder": "Наприклад: реакція на акрилати",
    "name.label": "Імʼя",
    "name.placeholder": "Як до вас звертатися",
    "phone.label": "Телефон",
    "telegram.label": "Telegram",
    "optional": "необовʼязково",

    "summary": "Ви записуєтеся на <strong>{service}</strong><br><strong>{date}</strong> о <strong>{time}</strong> · <strong>{price}</strong>",
    "submit": "Записатися",

    "success.title": "Дякуємо!",
    "success.text": "Вашу заявку надіслано. Ми звʼяжемося з вами для підтвердження запису.",
    "success.again": "Новий запис",
    "row.service": "Послуга",
    "row.date": "Дата",
    "row.time": "Час",
    "row.price": "Вартість",

    "modal.eyebrow": "Заявку створено",
    "modal.title": "Дякуємо!",
    "modal.text": "Ми вам зателефонуємо для уточнення запису.",
    "modal.ok": "Добре",
    "modal.close": "Закрити",

    "footer.contacts": "Звʼязатися з нами",
    "footer.call": "Зателефонувати",

    "err.service_required": "Оберіть послугу",
    "err.date_required": "Оберіть дату",
    "err.date_unavailable": "На цю дату запис недоступний",
    "err.time_required": "Оберіть час",
    "err.time_need_date": "Спочатку оберіть дату, потім час",
    "err.time_unavailable": "Цей час недоступний, оберіть інший",
    "err.allergy_required": "Опишіть, будь ласка, алергію",
    "err.name_required": "Введіть імʼя",
    "err.name_format": "Імʼя може містити лише літери (щонайменше 2)",
    "err.phone_required": "Введіть номер телефону",
    "err.phone_format": "Номер має бути у форматі +380 XX XXX XX XX",
    "err.telegram_format": "Username: 5–32 символи, латиниця, цифри та _",

    "err.validation": "Перевірте заповнення форми",
    "err.invalid_request": "Некоректний запит. Оновіть сторінку та спробуйте ще раз.",
    "err.rate_limited": "Забагато заявок поспіль. Спробуйте трохи пізніше.",
    "err.send_failed": "Не вдалося надіслати заявку. Спробуйте ще раз за хвилину або звʼяжіться з нами телефоном.",
    "err.network": "Немає зʼєднання з сервером. Перевірте інтернет і спробуйте ще раз.",
  },

  en: {
    "meta.title": "{name} — online booking",
    "meta.description": "Online booking for manicure and pedicure",
    "lang.label": "Site language",
    "hero.cta": "Book now",
    "features.aria": "Why us",

    "booking.eyebrow": "Online booking",
    "booking.title": "Choose a convenient time",
    "booking.sub": 'Fields marked with <span class="req">*</span> are required',

    "step.service": "Service",
    "step.datetime": "Date & time",
    "step.contacts": "Your details",

    "service.label": "What would you like?",
    "service.placeholder": "Choose a service",
    "price.label": "Price",
    "price.hint": "Choose a service to see the price",

    "date.label": "Date",
    "time.label": "Time",
    "slots.empty": "Choose a date first",
    "cal.prev": "Previous month",
    "cal.next": "Next month",
    "cal.unavailable": "unavailable",

    "allergy.title": "I have an allergy",
    "allergy.sub": "To materials, products or substances",
    "allergy.label": "Describe your allergy",
    "allergy.placeholder": "For example: reaction to acrylates",
    "name.label": "Name",
    "name.placeholder": "What should we call you",
    "phone.label": "Phone",
    "telegram.label": "Telegram",
    "optional": "optional",

    "summary": "You are booking <strong>{service}</strong><br><strong>{date}</strong> at <strong>{time}</strong> · <strong>{price}</strong>",
    "submit": "Book now",

    "success.title": "Thank you!",
    "success.text": "Your request has been sent. We will contact you to confirm your appointment.",
    "success.again": "New booking",
    "row.service": "Service",
    "row.date": "Date",
    "row.time": "Time",
    "row.price": "Price",

    "modal.eyebrow": "Request created",
    "modal.title": "Thank you!",
    "modal.text": "We will call you back to confirm the details of your appointment.",
    "modal.ok": "OK",
    "modal.close": "Close",

    "footer.contacts": "Contact us",
    "footer.call": "Call",

    "err.service_required": "Please choose a service",
    "err.date_required": "Please choose a date",
    "err.date_unavailable": "Booking is not available on this date",
    "err.time_required": "Please choose a time",
    "err.time_need_date": "Choose a date first, then a time",
    "err.time_unavailable": "This time is unavailable, please choose another",
    "err.allergy_required": "Please describe your allergy",
    "err.name_required": "Please enter your name",
    "err.name_format": "Name can contain letters only (at least 2)",
    "err.phone_required": "Please enter your phone number",
    "err.phone_format": "Use the format +380 XX XXX XX XX",
    "err.telegram_format": "Username: 5–32 characters, Latin letters, digits and _",

    "err.validation": "Please check the form",
    "err.invalid_request": "Invalid request. Please refresh the page and try again.",
    "err.rate_limited": "Too many requests in a row. Please try again a bit later.",
    "err.send_failed": "Could not send your request. Please try again in a minute or contact us by phone.",
    "err.network": "No connection to the server. Check your internet and try again.",
  },
};

const STORAGE_KEY = "lang";
const codes = LANGUAGES.available.map((l) => l.code);
let current = detectLang();

function detectLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (codes.includes(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (codes.includes(saved)) return saved;
  } catch {}
  for (const browserLang of navigator.languages || [navigator.language]) {
    const code = String(browserLang).slice(0, 2).toLowerCase();
    if (codes.includes(code)) return code;
  }
  return LANGUAGES.defaultLang;
}

export const getLang = () => current;
export const getLocale = () => LANGUAGES.available.find((l) => l.code === current)?.locale || "ru-RU";

export function setLang(code) {
  if (!codes.includes(code)) return;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

/** Перевод по ключу. vars подставляются в {плейсхолдеры}. */
export function t(key, vars = {}) {
  const template = DICT[current]?.[key] ?? DICT[LANGUAGES.defaultLang][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

/** Применяет переводы ко всем элементам с data-i18n* атрибутами. */
export function applyTranslations(root = document) {
  document.documentElement.lang = current;
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
}
