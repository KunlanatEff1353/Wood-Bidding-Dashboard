// ==========================================================================
// ตั้งค่าตรงนี้ที่เดียว — ไม่ต้องแก้โค้ดส่วนอื่น
// ==========================================================================
const CONFIG = {
  // วิธีได้ลิงก์ CSV จาก Google Sheet:
  // 1. เปิด Google Sheet -> File > Share > Publish to web
  // 2. เลือก sheet ทีละแท็บ (source, WMS) -> เลือกรูปแบบ "Comma-separated values (.csv)"
  // 3. กด Publish แล้วคัดลอกลิงก์มาใส่ด้านล่างนี้
  SHEET_SOURCE_CSV_URL: "https://docs.google.com/spreadsheets/d/e/PUT_YOUR_SHEET_ID/pub?gid=0&single=true&output=csv",
  SHEET_WMS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/PUT_YOUR_SHEET_ID/pub?gid=123456789&single=true&output=csv",

  // ถ้ายังไม่ได้ต่อ Google Sheet จริง ใส่ true เพื่อใช้ข้อมูลตัวอย่างในไฟล์ js/sample-data.js แทน
  USE_SAMPLE_DATA: true,

  // ชื่อคอลัมน์ใน sheet "source" (รายชื่อลูกค้าที่ชนะประมูลในแต่ละรอบ)
  SOURCE_COLUMNS: {
    customer: "ลูกค้า",
    biddingRound: "รอบBidding",       // เช่น "1-7 ส.ค. 2569"
    roundStartDate: "วันเริ่มรอบ",     // วันที่ในรูปแบบ YYYY-MM-DD
    roundEndDate: "วันสิ้นสุดรอบ",     // วันที่ในรูปแบบ YYYY-MM-DD
    factory: "โรงงาน",                // A / B / C
    channel: "ช่องทาง",               // หน้างาน / สวน / เหมาแปลง / ไม้ล้มขาย
    wonVolume: "ปริมาณเคาะซื้อ",       // ตัวเลข (ตัน)
    cumulativeDelivered: "ปริมาณสะสมที่ส่งเข้ามาแล้ว", // ตัวเลข (ตัน)
  },

  // ชื่อคอลัมน์ใน sheet "WMS" (รายการที่ลูกค้าส่งไม้เข้าจริงแต่ละรอบ/แต่ละคัน)
  WMS_COLUMNS: {
    customer: "ลูกค้า",
    day: "วันที่เข้า",       // เลขวัน เช่น 21
    month: "เดือน",         // เลขเดือน เช่น 8
    year: "ปี",             // เลขปี เช่น 2569 หรือ 2026 (ถ้าไม่มีคอลัมน์นี้ ระบบจะใช้ปีปัจจุบัน)
    biddingRound: "รอบBidding",
    volume: "ปริมาณที่ส่ง", // ตัน ต่อ 1 แถว/1 คัน/1 รอบที่เข้า
    factory: "โรงงาน",
    channel: "ช่องทาง",
    vehicleId: "ทะเบียนรถ", // ใช้แยกนับ "จำนวนรถ" (ถ้าไม่มี จะนับ 1 แถว = 1 คัน)
    reason: "เหตุผล",       // เติมทีหลังถ้ายังไม่ส่ง เช่น สภาพอากาศ / ราคา / คนหยุดงาน
  },

  // เฉลี่ยเป้ารายวัน = ปริมาณเคาะซื้อรวมทั้งรอบ / จำนวนวันนี้
  TARGET_DAYS_PER_ROUND: 7,

  // เกณฑ์สี RAG (สัญญาณเดือน) ตาม % เทียบเป้า
  RAG_THRESHOLDS: { red: 80, amber: 95 }, // ต่ำกว่า red = แดง, ต่ำกว่า amber = เหลือง, ที่เหลือ = เขียว
};
