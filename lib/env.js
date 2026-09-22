/**
 * Мини-загрузчик файла .env без зависимостей.
 * Переменные окружения системы имеют приоритет над файлом.
 */
import { existsSync, readFileSync } from "node:fs";

export function loadEnv(file) {
  if (!existsSync(file)) return false;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
  return true;
}
