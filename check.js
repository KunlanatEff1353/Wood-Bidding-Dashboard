// Vercel Serverless Function: /api/check
// ตรวจสอบว่า session cookie ที่ browser ส่งมายังไม่หมดอายุและไม่ถูกปลอม
const crypto = require("crypto");

function verify(token, secret) {
  if (!token || !token.includes(".")) return false;
  const [value, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(value).digest("hex");
  const validSig = crypto.timingSafeEqual(Buffer.from(sig || "", "hex"), Buffer.from(expected, "hex"));
  if (!validSig) return false;
  return Date.now() < parseInt(value, 10);
}

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? match.split("=")[1] : null;
}

module.exports = (req, res) => {
  const secret = process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || "change-me";
  const token = getCookie(req, "wd_session");

  if (verify(token, secret)) {
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
};
