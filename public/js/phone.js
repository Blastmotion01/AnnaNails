/**
 * Маска украинского номера: +380 XX XXX XX XX
 * Понимает ввод и вставку в форматах 0671234567, 380671234567, +38 (067) 123-45-67.
 */

const PREFIX = "+380 ";

function localDigits(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("380")) digits = digits.slice(3);
  else if (digits.startsWith("80") && digits.length > 9) digits = digits.slice(2);
  // Коды операторов не начинаются с 0: «+380 067…» → «+380 67…»
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

function format(local) {
  const groups = [local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean);
  return PREFIX + groups.join(" ");
}

export function isValidPhone(value) {
  return localDigits(value).length === 9;
}

export function attachPhoneMask(input) {
  let previous = "";

  input.addEventListener("focus", () => {
    if (!input.value) input.value = PREFIX;
  });

  input.addEventListener("blur", () => {
    if (input.value.trim() === PREFIX.trim()) input.value = "";
  });

  input.addEventListener("input", (e) => {
    let local = localDigits(input.value);
    // Удаление пробела не должно «залипать»: удаляем последнюю цифру
    if (e.inputType?.startsWith("delete") && local === localDigits(previous) && local.length) {
      local = local.slice(0, -1);
    }
    input.value = format(local);
    previous = input.value;
    const end = input.value.length;
    input.setSelectionRange(end, end);
  });
}
