/**
 * Serverless-функция Vercel: POST /api/telegram — webhook бота.
 * Обрабатывает кнопку «Отменить запись» под заявками.
 * Регистрация: npm run telegram:webhook -- https://ваш-сайт.vercel.app
 */
import { handleTelegramUpdate } from "../lib/telegram-webhook.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }
  const { status, json } = await handleTelegramUpdate(req.body, {
    secretHeader: req.headers["x-telegram-bot-api-secret-token"],
    env: process.env,
  });
  return res.status(status).json(json);
}
