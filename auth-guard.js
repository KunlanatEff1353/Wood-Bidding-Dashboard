// ใส่สคริปต์นี้ไว้บนสุดของทุกหน้าที่ต้องการจำกัดสิทธิ์เข้าใช้
// เช็ก session cookie กับ /api/check ก่อนแสดงเนื้อหา ถ้าไม่ผ่านจะเด้งไปหน้า login.html
(async function guard() {
  try {
    const res = await fetch("/api/check", { credentials: "include" });
    if (!res.ok) throw new Error("unauthorized");
  } catch (e) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`/login.html?next=${next}`);
  }
})();

async function logout() {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  location.replace("/login.html");
}
