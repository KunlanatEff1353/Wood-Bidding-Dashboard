// Vercel Serverless Function: /api/login
// ตรวจสอบรหัสผ่านที่ตั้งไว้ใน Environment Variable ชื่อ DASHBOARD_PASSWORD
// ถ้าถูกต้อง จะออก session cookie (httpOnly) อายุ 12 ชั่วโมง
const crypto = require("crypto");

function sign(value, secret) {
  const h = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${h}`;
}

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const secret = process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || "change-me";
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    res.status(500).json({ error: "ยังไม่ได้ตั้งค่า DASHBOARD_PASSWORD บนเซิร์ฟเวอร์" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const password = (body && body.password) || "";

  if (password !== correctPassword) {
    res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    return;
  }

  const expires = Date.now() + 12 * 60 * 60 * 1000; // 12 ชั่วโมง
  const token = sign(String(expires), secret);

  res.setHeader(
    "Set-Cookie",
    `wd_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${12 * 60 * 60}`
  );
  res.status(200).json({ ok: true });
};
