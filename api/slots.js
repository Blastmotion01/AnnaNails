/**
 * Serverless-функция Vercel: GET /api/slots?from=ГГГГ-ММ-ДД&to=ГГГГ-ММ-ДД
 * Отдаёт занятое время, чтобы сайт не предлагал его клиентам.
 */
import { handleSlots } from "../lib/booking.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "invalid_request" });
  }
  const { status, json } = await handleSlots(req.query || {}, { env: process.env });
  return res.status(status).json(json);
}
