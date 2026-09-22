/**
 * Кастомный выпадающий список (замена системному <select>, который нельзя стилизовать).
 * Поддерживает мышь, касание и клавиатуру: ↑ ↓ Enter Space Esc Tab Home End.
 *
 * @param {HTMLElement} root  элемент .dropdown с кнопкой .dropdown__trigger и списком .dropdown__list
 * @param {{ options: {value: string, label: string, meta?: string, aside?: string}[],
 *           placeholder: string, onChange: (value: string) => void }} opts
 */
export function createDropdown(root, { options, placeholder, onChange }) {
  const trigger = root.querySelector(".dropdown__trigger");
  const valueEl = root.querySelector(".dropdown__value");
  const list = root.querySelector(".dropdown__list");
  const baseId = trigger.id || "dropdown";

  let value = "";
  let active = -1;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let items = [];

  function renderOptions() {
    list.innerHTML = options
      .map(
        (o, i) => `
      <li class="dropdown__option" role="option" id="${baseId}-opt-${i}" data-index="${i}"
        aria-selected="${o.value === value}">
        <span class="dropdown__text">
          <span class="dropdown__label">${esc(o.label)}</span>
          ${o.meta ? `<span class="dropdown__meta">${esc(o.meta)}</span>` : ""}
        </span>
        ${o.aside ? `<span class="dropdown__aside">${esc(o.aside)}</span>` : ""}
      </li>`
      )
      .join("");
    items = [...list.children];
    const selectedOption = options.find((o) => o.value === value);
    valueEl.textContent = selectedOption ? selectedOption.label : placeholder;
    valueEl.classList.toggle("is-placeholder", !selectedOption);
  }

  const isOpen = () => root.classList.contains("is-open");

  function setActive(i) {
    active = Math.max(0, Math.min(options.length - 1, i));
    items.forEach((el, idx) => el.classList.toggle("is-active", idx === active));
    list.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  }

  function open() {
    if (isOpen()) return;
    root.classList.add("is-open");
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    list.focus({ preventScroll: true });
    document.addEventListener("pointerdown", onOutside, true);
  }

  function close(focusTrigger = true) {
    if (!isOpen()) return;
    root.classList.remove("is-open");
    list.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onOutside, true);
    if (focusTrigger) trigger.focus({ preventScroll: true });
  }

  function select(i) {
    const option = options[i];
    value = option.value;
    items.forEach((el, idx) => el.setAttribute("aria-selected", idx === i));
    valueEl.textContent = option.label;
    valueEl.classList.remove("is-placeholder");
    close();
    onChange(value);
  }

  function onOutside(e) {
    if (!root.contains(e.target)) close(false);
  }

  trigger.addEventListener("click", () => (isOpen() ? close() : open()));
  trigger.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".dropdown__option");
    if (item) select(Number(item.dataset.index));
  });
  list.addEventListener("pointermove", (e) => {
    const item = e.target.closest(".dropdown__option");
    if (item && Number(item.dataset.index) !== active) setActive(Number(item.dataset.index));
  });
  list.addEventListener("keydown", (e) => {
    const keys = {
      ArrowDown: () => setActive(active + 1),
      ArrowUp: () => setActive(active - 1),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      Enter: () => select(active),
      " ": () => select(active),
      Escape: () => close(),
    };
    if (e.key === "Tab") return close(false);
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  });

  function reset() {
    value = "";
    close(false);
    renderOptions();
  }

  reset();

  return {
    get value() {
      return value;
    },
    reset,
    /** Заменить варианты (например, после смены языка), выбор сохраняется */
    setOptions(newOptions, newPlaceholder = placeholder) {
      options = newOptions;
      placeholder = newPlaceholder;
      close(false);
      renderOptions();
    },
    focus: () => trigger.focus({ preventScroll: true }),
  };
}
