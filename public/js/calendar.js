/**
 * Лёгкий календарь выбора даты без зависимостей.
 * Прошедшие, выходные и недоступные дни заблокированы.
 * Названия месяцев и дней недели берутся из Intl на текущем языке.
 */

const ICON_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

export const toIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @param {HTMLElement} root
 * @param {{ minDate: Date, maxDate: Date, isDisabled: (iso: string) => boolean, onSelect: (iso: string) => void,
 *           labels: () => { locale: string, prev: string, next: string, unavailable: string } }} opts
 */
export function createCalendar(root, { minDate, maxDate, isDisabled, onSelect, labels }) {
  const todayIso = toIso(new Date());

  let selected = null;
  let view = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  // Если в текущем месяце не осталось свободных дней — сразу показываем следующий
  const firstAvailable = findFirstAvailable();
  if (firstAvailable) view = new Date(firstAvailable.getFullYear(), firstAvailable.getMonth(), 1);

  root.innerHTML = `
    <div class="calendar__head">
      <p class="calendar__month" aria-live="polite"></p>
      <div class="calendar__nav">
        <button type="button" class="calendar__btn" data-dir="-1">${ICON_PREV}</button>
        <button type="button" class="calendar__btn" data-dir="1">${ICON_NEXT}</button>
      </div>
    </div>
    <div class="calendar__grid" role="grid"></div>`;

  const monthEl = root.querySelector(".calendar__month");
  const gridEl = root.querySelector(".calendar__grid");
  const prevBtn = root.querySelector('[data-dir="-1"]');
  const nextBtn = root.querySelector('[data-dir="1"]');

  root.querySelectorAll(".calendar__btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() + Number(btn.dataset.dir), 1);
      render();
    })
  );

  gridEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".calendar__day");
    if (!btn || btn.disabled) return;
    selected = btn.dataset.date;
    render();
    onSelect(selected);
  });

  function findFirstAvailable() {
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      if (!isDisabled(toIso(d))) return new Date(d);
    }
    return null;
  }

  function render() {
    const { locale, prev, next, unavailable } = labels();
    const monthFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
    const dayLabelFmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
    const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 1 января 2024 — понедельник: берём от него 7 названий дней недели
    const weekdays = Array.from({ length: 7 }, (_, i) =>
      capitalize(weekdayFmt.format(new Date(2024, 0, 1 + i)).replace(".", ""))
    );

    const year = view.getFullYear();
    const month = view.getMonth();
    monthEl.textContent = capitalize(monthFmt.format(view).replace(/\s*(г\.|р\.)$/, ""));
    prevBtn.setAttribute("aria-label", prev);
    nextBtn.setAttribute("aria-label", next);

    prevBtn.disabled = year === minDate.getFullYear() && month <= minDate.getMonth();
    nextBtn.disabled = year === maxDate.getFullYear() && month >= maxDate.getMonth();

    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // понедельник — первый
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const minIso = toIso(minDate);
    const maxIso = toIso(maxDate);

    let html = weekdays.map((w) => `<span class="calendar__wd" aria-hidden="true">${w}</span>`).join("");
    html += "<span></span>".repeat(offset);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const iso = toIso(date);
      const disabled = iso < minIso || iso > maxIso || isDisabled(iso);
      const cls = ["calendar__day", iso === todayIso && "is-today", iso === selected && "is-selected"]
        .filter(Boolean)
        .join(" ");
      html += `<button type="button" class="${cls}" data-date="${iso}" ${disabled ? "disabled" : ""}
        aria-pressed="${iso === selected}" aria-label="${dayLabelFmt.format(date)}${disabled ? ", " + unavailable : ""}">${day}</button>`;
    }
    gridEl.innerHTML = html;
  }

  render();

  return {
    /** Перерисовать (например, после смены языка) */
    refresh: render,
    reset() {
      selected = null;
      const first = findFirstAvailable();
      if (first) view = new Date(first.getFullYear(), first.getMonth(), 1);
      render();
    },
  };
}
