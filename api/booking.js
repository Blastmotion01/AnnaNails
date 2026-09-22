/**
 * Serverless-функция Vercel: POST /api/booking
 * Секреты берутся из Environment Variables проекта на Vercel.
 */
import { handleBooking } from "../lib/booking.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, code: "invalid_request" });
  }

  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    return res.status(415).json({ ok: false, code: "invalid_request" });
  }

  // Необязательная защита: принимать заявки только со своего домена.
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && req.headers.origin && req.headers.origin !== allowed) {
    return res.status(403).json({ ok: false, code: "invalid_request" });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const { status, json } = await handleBooking(req.body, { ip, env: process.env });
  return res.status(status).json(json);
}
