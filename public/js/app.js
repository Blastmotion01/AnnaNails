import { HERO_IMAGE, SITE, SERVICES, SCHEDULE, CONTACTS, FEATURES, LANGUAGES, localize } from "../config.js";
import { createCalendar, toIso, fromIso } from "./calendar.js";
import { attachPhoneMask, isValidPhone } from "./phone.js";
import { createDropdown } from "./dropdown.js";
import { t, getLang, setLang, getLocale, applyTranslations } from "./i18n.js";

const API_URL = "/api/booking";

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Текст из config.js на текущем языке */
const L = (value) => localize(value, getLang());
const formatPrice = (n) => `${n.toLocaleString(getLocale())} ${L(SITE.currency)}`;
const formatDate = (iso) =>
  new Intl.DateTimeFormat(getLocale(), { weekday: "short", day: "numeric", month: "long" }).format(fromIso(iso));

/* ==========================================================
   Контент из config.js
   ========================================================== */
function initHeroImage() {
  // Hero-фото: плавное появление, при ошибке остаётся градиент
  const img = $("#heroImage");
  if (HERO_IMAGE) {
    img.addEventListener("load", () => img.classList.add("is-loaded"));
    img.addEventListener("error", () => img.remove());
    img.src = HERO_IMAGE;
  } else {
    img.remove();
  }
  $("#year").textContent = new Date().getFullYear();
}

function renderContent() {
  const name = L(SITE.name);
  document.title = t("meta.title", { name });
  document.querySelector('meta[name="description"]').content = t("meta.description");
  document.querySelectorAll("[data-site]").forEach((el) => {
    el.textContent = L(SITE[el.dataset.site]);
  });

  $("#features").innerHTML = FEATURES.map(
    (f, i) => `
    <li class="feature">
      <span class="feature__num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <div>
        <p class="feature__title">${esc(L(f.title))}</p>
        <p class="feature__text">${esc(L(f.text))}</p>
      </div>
    </li>`
  ).join("");

  renderTicker();
  renderContacts();
}

/* ---------- Бегущая строка с услугами ---------- */
function renderTicker() {
  const names = [...new Set(SERVICES.map((s) => L(s.name)))];
  const group = names.map((n) => `<span>${esc(n)}</span><i aria-hidden="true">◆</i>`).join("");
  // Две одинаковые половины — для бесшовной прокрутки
  $("#ticker").innerHTML = `<div class="ticker__group">${group}</div><div class="ticker__group">${group}</div>`;
}

/* ---------- Переключатель языка ---------- */
function renderLangSwitch() {
  $("#langSwitch").innerHTML = LANGUAGES.available
    .map(
      (l) => `<button type="button" class="lang__btn" data-lang="${esc(l.code)}" lang="${esc(l.code)}"
        aria-pressed="${l.code === getLang()}">${esc(l.label)}</button>`
    )
    .join("");
}

function initLangSwitch() {
  renderLangSwitch();
  $("#langSwitch").addEventListener("click", (e) => {
    const btn = e.target.closest(".lang__btn");
    if (!btn || btn.dataset.lang === getLang()) return;
    setLang(btn.dataset.lang);
    applyLanguage();
  });
}

/* ---------- Контакты в подвале ---------- */
const ICONS = {
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  instagram:
    '<rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="0.6" fill="currentColor"/>',
  telegram: '<path d="M21.5 3.5 2.8 10.7c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.3.8 1.3 1 1.9.4l2.6-2.5 4.9 3.6c.7.5 1.6.1 1.8-.7l3.2-15.4c.2-1-.8-1.8-1.7-1.5Z"/><path d="m7.5 14 9.6-6.3-6.4 7.4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

function renderContacts() {
  const socials = [];
  if (CONTACTS.phone)
    socials.push({ href: `tel:${CONTACTS.phone.replace(/[^\d+]/g, "")}`, icon: "phone", label: `${t("footer.call")}: ${CONTACTS.phone}` });
  if (CONTACTS.instagram)
    socials.push({ href: `https://instagram.com/${CONTACTS.instagram.replace("@", "")}`, icon: "instagram", label: "Instagram", external: true });
  if (CONTACTS.telegram)
    socials.push({ href: `https://t.me/${CONTACTS.telegram.replace("@", "")}`, icon: "telegram", label: "Telegram", external: true });

  $("#socials").innerHTML = socials
    .map(
      (s) => `<li><a class="social" href="${esc(s.href)}" aria-label="${esc(s.label)}" title="${esc(s.label)}"
        ${s.external ? 'target="_blank" rel="noopener"' : ""}>${icon(s.icon)}</a></li>`
    )
    .join("");

  const info = [];
  const address = L(CONTACTS.address);
  const hours = L(CONTACTS.workingHours);
  if (address) info.push(`<li>${icon("pin")}<span>${esc(address)}</span></li>`);
  if (hours) info.push(`<li>${icon("clock")}<span>${esc(hours)}</span></li>`);
  $("#contactInfo").innerHTML = info.join("");
}

/* ==========================================================
   Расписание
   ========================================================== */
const slotsFor = (iso) => SCHEDULE.timeSlotsByWeekday?.[fromIso(iso).getDay()] ?? SCHEDULE.timeSlots;

function isSlotPast(iso, time) {
  if (iso !== toIso(new Date())) return false;
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  return h * 60 + m < now.getHours() * 60 + now.getMinutes() + SCHEDULE.minLeadMinutes;
}

/* ---------- Занятое время (с сервера) ---------- */
const SLOTS_URL = "/api/slots";
let busy = {}; // { "ГГГГ-ММ-ДД": ["ЧЧ:ММ", ...] }

const isSlotBusy = (iso, time) => busy[iso]?.includes(time) ?? false;
const isSlotUnavailable = (iso, time) => isSlotPast(iso, time) || isSlotBusy(iso, time);

/** Загружает занятые слоты. Без аргумента — на весь период записи. */
async function loadBusy(date) {
  try {
    const query = date ? `?from=${date}&to=${date}` : "";
    const res = await fetch(SLOTS_URL + query, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.enabled) return;
    if (date) {
      if (json.busy[date]) busy[date] = json.busy[date];
      else delete busy[date];
    } else {
      busy = json.busy || {};
    }
  } catch {
    // Нет связи — показываем расписание без учёта броней, сервер всё равно не даст занять слот дважды
  }
}

/** Перерисовать календарь и время после обновления занятости */
function refreshAvailability() {
  calendar.refresh();
  const iso = fields.date.value;
  if (iso && fields.time.value && isSlotUnavailable(iso, fields.time.value)) {
    fields.time.value = "";
    updateSummary();
  }
  renderSlots();
}

function isDateDisabled(iso) {
  if (!SCHEDULE.workingDays.includes(fromIso(iso).getDay())) return true;
  if (SCHEDULE.daysOff.includes(iso)) return true;
  return slotsFor(iso).every((time) => isSlotUnavailable(iso, time)); // всё время прошло или занято
}

/* ==========================================================
   Форма
   ========================================================== */
const form = $("#bookingForm");
const fields = {
  service: $("#service"),
  date: $("#date"),
  time: $("#time"),
  hasAllergy: $("#hasAllergy"),
  allergy: $("#allergy"),
  name: $("#name"),
  phone: $("#phone"),
  telegram: $("#telegram"),
};
const submitBtn = $("#submitBtn");
const slotsEl = $("#slots");
let calendar;
let serviceDropdown;
let isSubmitting = false;
let lastBooking = null;

// Ошибки храним кодами, чтобы при смене языка перевести их заново
const errorCodes = {};
let alertCode = "";

function setError(name, code) {
  const wrap = form.querySelector(`[data-field="${name}"]`);
  if (!wrap) return;
  if (code) errorCodes[name] = code;
  else delete errorCodes[name];
  wrap.classList.toggle("has-error", Boolean(code));
  const errEl = $(`#err-${name}`);
  if (errEl) errEl.textContent = code ? t(`err.${code}`) : "";
  const input = fields[name];
  if (input && input.type !== "hidden") input.setAttribute("aria-invalid", code ? "true" : "false");
}

const selectedService = () => SERVICES.find((s) => s.id === serviceDropdown?.value);

// Валидаторы возвращают код ошибки (перевод — в i18n.js, ключи err.*) или ""
const validators = {
  service: () => (selectedService() ? "" : "service_required"),
  date: () => (fields.date.value ? "" : "date_required"),
  time: () => (fields.time.value ? "" : fields.date.value ? "time_required" : "time_need_date"),
  allergy: () => (fields.hasAllergy.checked && fields.allergy.value.trim().length < 3 ? "allergy_required" : ""),
  name: () => {
    const v = fields.name.value.trim();
    if (!v) return "name_required";
    if (!/^[\p{L}][\p{L} '’.-]{1,59}$/u.test(v)) return "name_format";
    return "";
  },
  phone: () => {
    const v = fields.phone.value.replace(/[\s+]/g, "");
    if (!v || v === "380") return "phone_required";
    return isValidPhone(fields.phone.value) ? "" : "phone_format";
  },
  telegram: () => {
    const v = fields.telegram.value.trim().replace(/^@+/, "");
    if (!v) return "";
    return /^[A-Za-z0-9_]{5,32}$/.test(v) ? "" : "telegram_format";
  },
};

function validateField(name) {
  const code = validators[name]?.() ?? "";
  setError(name, code);
  return !code;
}

function validateAll() {
  const invalid = Object.keys(validators).filter((name) => !validateField(name));
  if (invalid.length) focusField(invalid[0]);
  return invalid.length === 0;
}

function focusField(name) {
  const wrap = form.querySelector(`[data-field="${name}"]`);
  wrap?.scrollIntoView({ behavior: "smooth", block: "center" });
  const target =
    name === "date"
      ? $(".calendar__day:not(:disabled)", wrap)
      : name === "time"
        ? $(".slot:not(:disabled)", wrap)
        : fields[name];
  setTimeout(() => target?.focus({ preventScroll: true }), 350);
}

// Перепроверяем поле, пока пользователь исправляет ошибку
function revalidateOnChange(name, event = "input") {
  fields[name].addEventListener(event, () => {
    if (errorCodes[name]) validateField(name);
    updateSummary();
  });
}

/* ---------- Услуга и цена ---------- */
const serviceOptions = () =>
  SERVICES.map((s) => ({ value: s.id, label: L(s.name), meta: L(s.duration), aside: formatPrice(s.price) }));

function initServices() {
  serviceDropdown = createDropdown($("#serviceDropdown"), {
    placeholder: t("service.placeholder"),
    options: serviceOptions(),
    onChange() {
      updatePrice(true);
      validateField("service");
      updateSummary();
    },
  });
}

function updatePrice(animate = false) {
  const service = selectedService();
  const valueEl = $("#priceValue");
  valueEl.textContent = service ? formatPrice(service.price) : "—";
  $("#priceDuration").textContent = service
    ? [L(service.name), L(service.duration)].filter(Boolean).join(" · ")
    : t("price.hint");
  if (!animate) return;
  valueEl.classList.remove("is-updated");
  void valueEl.offsetWidth; // перезапуск анимации
  valueEl.classList.add("is-updated");
}

/* ---------- Дата и время ---------- */
function initDateTime() {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + SCHEDULE.daysAhead);

  calendar = createCalendar($("#calendar"), {
    minDate,
    maxDate,
    isDisabled: isDateDisabled,
    labels: () => ({
      locale: getLocale(),
      prev: t("cal.prev"),
      next: t("cal.next"),
      unavailable: t("cal.unavailable"),
    }),
    onSelect(iso) {
      fields.date.value = iso;
      fields.time.value = "";
      renderSlots();
      validateField("date");
      setError("time", "");
      updateSummary();
      // Уточняем занятость выбранного дня: пока клиент смотрел сайт, время могли занять
      loadBusy(iso).then(() => {
        if (fields.date.value === iso) refreshAvailability();
      });
    },
  });

  slotsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".slot");
    if (!btn || btn.disabled) return;
    fields.time.value = btn.dataset.time;
    slotsEl.querySelectorAll(".slot").forEach((s) => {
      const active = s === btn;
      s.classList.toggle("is-selected", active);
      s.setAttribute("aria-checked", active);
    });
    validateField("time");
    updateSummary();
  });

  renderSlots();
}

function renderSlots() {
  const iso = fields.date.value;
  if (!iso) {
    slotsEl.innerHTML = `<p class="slots__empty">${esc(t("slots.empty"))}</p>`;
    return;
  }
  const selected = fields.time.value;
  slotsEl.innerHTML = slotsFor(iso)
    .map((time) => {
      const taken = isSlotBusy(iso, time);
      const off = taken || isSlotPast(iso, time);
      const active = time === selected && !off;
      const note = taken ? t("slots.busy") : t("cal.unavailable");
      return `<button type="button" class="slot${active ? " is-selected" : ""}${taken ? " is-busy" : ""}"
        role="radio" aria-checked="${active}" data-time="${esc(time)}"
        ${off ? `disabled aria-label="${esc(time)}, ${esc(note)}"` : ""}>
        <span class="slot__time">${esc(time)}</span>${taken ? `<span class="slot__note">${esc(note)}</span>` : ""}
      </button>`;
    })
    .join("");
}

/* ---------- Аллергия ---------- */
function initAllergy() {
  const box = $("#allergyBox");
  fields.hasAllergy.addEventListener("change", () => {
    const on = fields.hasAllergy.checked;
    box.hidden = !on;
    if (on) setTimeout(() => fields.allergy.focus(), 50);
    else setError("allergy", "");
  });
}

/* ---------- Сводка перед отправкой ---------- */
function updateSummary() {
  const el = $("#summary");
  const service = selectedService();
  const date = fields.date.value;
  const time = fields.time.value;
  if (!service || !date || !time) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = t("summary", {
    service: esc(L(service.name)),
    date: esc(formatDate(date)),
    time: esc(time),
    price: esc(formatPrice(service.price)),
  });
}

/* ---------- Отправка ---------- */
function setLoading(on) {
  isSubmitting = on;
  submitBtn.disabled = on;
  submitBtn.classList.toggle("is-loading", on);
  submitBtn.setAttribute("aria-busy", on);
}

function showAlert(code) {
  alertCode = code || "";
  const el = $("#formAlert");
  el.textContent = code ? t(`err.${code}`) : "";
  el.hidden = !code;
}

function collectData() {
  const tg = fields.telegram.value.trim().replace(/^@+/, "");
  return {
    service: serviceDropdown.value,
    date: fields.date.value,
    time: fields.time.value,
    hasAllergy: fields.hasAllergy.checked,
    allergy: fields.hasAllergy.checked ? fields.allergy.value.trim() : "",
    name: fields.name.value.trim(),
    phone: fields.phone.value.trim(),
    telegram: tg ? "@" + tg : "",
    lang: getLang(),
    website: form.elements.website.value, // honeypot
  };
}

async function onSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return; // защита от двойной отправки
  showAlert("");
  if (!validateAll()) return;

  const data = collectData();
  setLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.ok) {
      showSuccess(data);
      return;
    }
    if (json.errors) {
      if (json.code === "time_taken") {
        // Время только что занял другой клиент — помечаем и обновляем занятость дня
        busy[data.date] = [...new Set([...(busy[data.date] || []), data.time])];
        refreshAvailability();
        loadBusy(data.date).then(refreshAvailability);
      } else if (json.errors.time || json.errors.date) {
        renderSlots(); // время могло пройти
      }
      Object.entries(json.errors).forEach(([name, code]) => setError(name, code));
      const first = Object.keys(json.errors)[0];
      if (first) focusField(first);
      if (json.code === "time_taken") return; // пояснение уже под полем «Время»
    }
    showAlert(json.code || "send_failed");
  } catch {
    showAlert("network");
  } finally {
    setLoading(false);
  }
}

function renderSuccessDetails() {
  if (!lastBooking) return;
  const service = SERVICES.find((s) => s.id === lastBooking.service);
  const rows = [
    [t("row.service"), L(service.name)],
    [t("row.date"), formatDate(lastBooking.date)],
    [t("row.time"), lastBooking.time],
    [t("row.price"), formatPrice(service.price)],
  ];
  $("#successDetails").innerHTML = rows
    .map(([k, v]) => `<div class="success__row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`)
    .join("");
  $("#modalDetails").textContent = [L(service.name), formatDate(lastBooking.date), lastBooking.time].join(" · ");
}

function showSuccess(data) {
  lastBooking = data;
  busy[data.date] = [...new Set([...(busy[data.date] || []), data.time])];
  renderSuccessDetails();
  form.hidden = true;
  const success = $("#success");
  success.hidden = false;
  // Под окном сразу показываем блок с деталями заявки
  success.scrollIntoView({ behavior: "instant", block: "center" });
  openModal();
}

/* ---------- Модальное окно «Мы вам перезвоним» ---------- */
const modal = $("#successModal");

function openModal() {
  if (typeof modal.showModal !== "function") return; // очень старые браузеры: остаётся блок «Спасибо»
  document.documentElement.classList.add("is-modal-open");
  modal.showModal();
  $("#modalOk").focus();
}

let modalClosing = false;

function closeModal() {
  if (!modal.open || modalClosing) return;
  modalClosing = true;
  modal.classList.add("is-closing");
  setTimeout(() => {
    modal.classList.remove("is-closing");
    modal.close();
    onModalClosed();
    modalClosing = false;
  }, 200);
}

function onModalClosed() {
  if (!document.documentElement.classList.contains("is-modal-open")) return;
  document.documentElement.classList.remove("is-modal-open");
  $("#success").focus({ preventScroll: true });
}

function initModal() {
  $("#modalOk").addEventListener("click", closeModal);
  $("#modalClose").addEventListener("click", closeModal);
  // Клик по затемнённому фону (вне карточки) закрывает окно
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  // Esc: закрываем с той же анимацией
  modal.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeModal();
  });
  modal.addEventListener("close", onModalClosed);
}

function resetForm() {
  form.reset();
  lastBooking = null;
  fields.date.value = "";
  fields.time.value = "";
  $("#allergyBox").hidden = true;
  Object.keys(validators).forEach((name) => setError(name, ""));
  serviceDropdown.reset();
  calendar.reset();
  renderSlots();
  updatePrice();
  updateSummary();
  showAlert("");
  $("#success").hidden = true;
  form.hidden = false;
  $("#booking").scrollIntoView({ behavior: "smooth" });
}

/* ---------- Смена языка: перерисовываем всё, сохраняя введённые данные ---------- */
function applyLanguage() {
  applyTranslations();
  renderLangSwitch();
  renderContent();
  serviceDropdown.setOptions(serviceOptions(), t("service.placeholder"));
  updatePrice();
  calendar.refresh();
  renderSlots();
  updateSummary();
  Object.entries({ ...errorCodes }).forEach(([name, code]) => setError(name, code));
  showAlert(alertCode);
  renderSuccessDetails();
}

/* ---------- Плавная прокрутка к форме ---------- */
function initScroll() {
  document.querySelectorAll("[data-scroll]").forEach((link) =>
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", link.getAttribute("href"));
    })
  );
}

/* ==========================================================
   Старт
   ========================================================== */
applyTranslations();
initHeroImage();
renderContent();
initLangSwitch();
initScroll();
initServices();
initDateTime();
initAllergy();
initModal();
updatePrice();
attachPhoneMask(fields.phone);

revalidateOnChange("name");
revalidateOnChange("phone");
revalidateOnChange("allergy");
revalidateOnChange("telegram");
fields.telegram.addEventListener("blur", () => {
  const v = fields.telegram.value.trim().replace(/^@+/, "");
  fields.telegram.value = v ? "@" + v : "";
  validateField("telegram");
});
[fields.name, fields.phone].forEach((input) => input.addEventListener("blur", () => input.value && validateField(input.id)));

form.addEventListener("submit", onSubmit);
$("#againBtn").addEventListener("click", resetForm);

// Занятое время на весь период записи — календарь блокирует полностью занятые дни
loadBusy().then(refreshAvailability);
