// ==========================================================================
// โหลดข้อมูลจาก Google Sheets (หรือข้อมูลตัวอย่าง) แล้วคำนวณ KPI ทั้งหมด
// ==========================================================================

function parseCsvUrl(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data),
      error: reject,
    });
  });
}

async function loadRawData() {
  if (CONFIG.USE_SAMPLE_DATA) {
    return { source: SAMPLE.source, wms: SAMPLE.wms };
  }
  const [source, wms] = await Promise.all([
    parseCsvUrl(CONFIG.SHEET_SOURCE_CSV_URL),
    parseCsvUrl(CONFIG.SHEET_WMS_CSV_URL),
  ]);
  return { source, wms };
}

function num(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function isToday(row, cols) {
  const now = new Date();
  const d = parseInt(row[cols.day], 10);
  const m = parseInt(row[cols.month], 10);
  const yRaw = row[cols.year];
  const y = yRaw ? parseInt(yRaw, 10) : now.getFullYear();
  return d === now.getDate() && m === (now.getMonth() + 1) && (isNaN(y) || y === now.getFullYear() || y === now.getFullYear() - 543);
}

function ragClass(pct) {
  if (pct < CONFIG.RAG_THRESHOLDS.red) return "bad";
  if (pct < CONFIG.RAG_THRESHOLDS.amber) return "warn";
  return "good";
}

async function loadDashboardData() {
  const { source, wms } = await loadRawData();
  const sc = CONFIG.SOURCE_COLUMNS;
  const wc = CONFIG.WMS_COLUMNS;
  const days = CONFIG.TARGET_DAYS_PER_ROUND || 7;

  const wmsToday = wms.filter((r) => isToday(r, wc));

  // ---- overview KPIs ----
  const totalWon = source.reduce((s, r) => s + num(r[sc.wonVolume]), 0);
  const totalCumulative = source.reduce((s, r) => s + num(r[sc.cumulativeDelivered]), 0);
  const targetDaily = totalWon / days;
  const actualToday = wmsToday.reduce((s, r) => s + num(r[wc.volume]), 0);
  const pctDaily = targetDaily > 0 ? (actualToday / targetDaily) * 100 : 0;
  const pctRound = totalWon > 0 ? (totalCumulative / totalWon) * 100 : 0;

  const deliveredVehicles = new Set(
    wmsToday.filter((r) => num(r[wc.volume]) > 0).map((r) => r[wc.vehicleId] || `${r[wc.customer]}-${r[wc.volume]}`)
  ).size;
  const customersDeliveredToday = new Set(
    wmsToday.filter((r) => num(r[wc.volume]) > 0).map((r) => r[wc.customer])
  );
  const allCustomers = new Set(source.map((r) => r[sc.customer]));
  const customersPendingToday = [...allCustomers].filter((c) => !customersDeliveredToday.has(c));

  // ---- group by factory ----
  const factoryMap = {};
  source.forEach((r) => {
    const f = r[sc.factory] || "ไม่ระบุ";
    if (!factoryMap[f]) factoryMap[f] = { name: f, won: 0, cumulative: 0 };
    factoryMap[f].won += num(r[sc.wonVolume]);
    factoryMap[f].cumulative += num(r[sc.cumulativeDelivered]);
  });
  wmsToday.forEach((r) => {
    const f = r[wc.factory] || "ไม่ระบุ";
    if (!factoryMap[f]) factoryMap[f] = { name: f, won: 0, cumulative: 0 };
    factoryMap[f].today = (factoryMap[f].today || 0) + num(r[wc.volume]);
  });
  const factories = Object.values(factoryMap).map((f) => {
    const target = f.won / days;
    const today = f.today || 0;
    const pct = target > 0 ? (today / target) * 100 : 0;
    return { ...f, target, today, pct };
  });

  // ---- group by channel ----
  const channelMap = {};
  source.forEach((r) => {
    const c = r[sc.channel] || "ไม่ระบุ";
    if (!channelMap[c]) channelMap[c] = { name: c, won: 0 };
    channelMap[c].won += num(r[sc.wonVolume]);
  });
  wmsToday.forEach((r) => {
    const c = r[wc.channel] || "ไม่ระบุ";
    if (!channelMap[c]) channelMap[c] = { name: c, won: 0 };
    channelMap[c].today = (channelMap[c].today || 0) + num(r[wc.volume]);
  });
  const channels = Object.values(channelMap).map((c) => {
    const target = c.won / days;
    const today = c.today || 0;
    const pct = target > 0 ? Math.min(100, (today / target) * 100) : 0;
    return { ...c, target, today, pct };
  });

  // ---- customer table ----
  const customers = source.map((r) => {
    const name = r[sc.customer];
    const target = num(r[sc.wonVolume]) / days;
    const today = wmsToday
      .filter((w) => w[wc.customer] === name)
      .reduce((s, w) => s + num(w[wc.volume]), 0);
    const pct = target > 0 ? (today / target) * 100 : 0;
    return { name, target, today, pct, status: ragClass(pct) };
  });

  // ---- reasons today (ยังไม่ส่ง / ส่งไม่ครบ) ----
  const reasons = wmsToday
    .filter((r) => (r[wc.reason] || "").trim() !== "")
    .map((r) => ({
      customer: r[wc.customer],
      vehicleId: r[wc.vehicleId],
      factory: r[wc.factory],
      reason: r[wc.reason],
    }));

  return {
    overview: {
      targetDaily,
      actualToday,
      pctDaily,
      pctRound,
      deliveredVehicles,
      pendingCount: customersPendingToday.length,
      totalCumulative,
      totalWon,
    },
    factories,
    channels,
    customers,
    reasons,
    ragDaily: ragClass(pctDaily),
    ragRound: ragClass(pctRound),
  };
}

// ---- ข้อมูลเฉพาะโรงงาน (สำหรับหน้า drill-down) ----
async function loadFactoryData(factoryName) {
  const { source, wms } = await loadRawData();
  const sc = CONFIG.SOURCE_COLUMNS;
  const wc = CONFIG.WMS_COLUMNS;
  const days = CONFIG.TARGET_DAYS_PER_ROUND || 7;

  const sourceRows = source.filter((r) => (r[sc.factory] || "ไม่ระบุ") === factoryName);
  const wmsRows = wms.filter((r) => (r[wc.factory] || "ไม่ระบุ") === factoryName);
  const wmsTodayRows = wmsRows.filter((r) => isToday(r, wc));

  const won = sourceRows.reduce((s, r) => s + num(r[sc.wonVolume]), 0);
  const cumulative = sourceRows.reduce((s, r) => s + num(r[sc.cumulativeDelivered]), 0);
  const target = won / days;
  const today = wmsTodayRows.reduce((s, r) => s + num(r[wc.volume]), 0);
  const pct = target > 0 ? (today / target) * 100 : 0;

  const vehicles = wmsTodayRows.map((r) => ({
    vehicleId: r[wc.vehicleId] || "-",
    customer: r[wc.customer],
    channel: r[wc.channel],
    volume: num(r[wc.volume]),
    reason: r[wc.reason] || "",
    delivered: num(r[wc.volume]) > 0,
  }));

  return {
    name: factoryName,
    won, cumulative, target, today, pct,
    ragDaily: ragClass(pct),
    vehicles,
  };
}
