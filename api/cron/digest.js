/**
 * Serverless-функция Vercel: GET /api/cron/digest
 * Вызывается планировщиком (vercel.json → crons): в 22:00 по времени мастера
 * присылает в Telegram список записей на завтра.
 */
import { handleDigestCron } from "../../lib/digest.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const { status, json } = await handleDigestCron({ authorization: req.headers.authorization, env: process.env });
  return res.status(status).json(json);
}
