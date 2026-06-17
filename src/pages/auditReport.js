const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const REPORT_CSS = `
:root { --accent:#7C5CFC; --green:#22C97A; --red:#F04060; --amber:#F5A623; --blue:#3B9EFF; }
* { box-sizing:border-box; }
body { font-family:system-ui,-apple-system,sans-serif; margin:0; padding:0; color:#111; background:#fff; font-size:14px; line-height:1.5; }
.page { max-width:900px; margin:0 auto; padding:40px 32px; }
.header { border-bottom:3px solid var(--accent); padding-bottom:20px; margin-bottom:32px; }
.logo { font-size:22px; font-weight:800; color:var(--accent); margin-bottom:6px; }
.report-title { font-size:28px; font-weight:700; color:#111; margin:0 0 4px; }
.meta { font-size:13px; color:#666; }
h2 { font-size:18px; font-weight:700; color:#111; margin:40px 0 16px; padding-bottom:8px; border-bottom:2px solid var(--accent); }
h3 { font-size:15px; font-weight:600; color:#333; margin:24px 0 12px; }
.metrics-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin:16px 0 24px; }
.metric { background:#f8f8fc; border-radius:10px; padding:16px; border:1px solid #e5e5ef; }
.metric-label { font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.5px; }
.metric-value { font-size:24px; font-weight:700; margin-top:4px; }
.metric-sub { font-size:12px; color:#888; margin-top:2px; }
table { width:100%; border-collapse:collapse; margin:12px 0 24px; }
th { text-align:left; padding:10px 12px; background:#f0f0f8; font-size:12px; font-weight:600; color:#444; border-bottom:2px solid #e5e5ef; }
td { padding:9px 12px; font-size:13px; border-bottom:1px solid #f0f0f0; }
tr:hover td { background:#fafafa; }
.badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
.badge-green { background:#22C97A22; color:#15803d; }
.badge-amber { background:#F5A62322; color:#92400e; }
.badge-red { background:#F0406022; color:#991b1b; }
.badge-blue { background:#3B9EFF22; color:#1d4ed8; }
.chart-section { margin:20px 0; }
.bar-chart { display:flex; align-items:flex-end; gap:6px; height:160px; padding:0 0 8px; }
.bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; min-width:0; }
.bar { width:100%; border-radius:4px 4px 0 0; min-height:3px; }
.bar-label { font-size:11px; color:#666; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; }
.bar-value { font-size:11px; font-weight:600; color:#333; }
.horiz-bar-row { margin:8px 0; }
.horiz-bar-label { display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; }
.horiz-bar-track { height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden; }
.horiz-bar-fill { height:100%; border-radius:4px; }
.dual-month { margin:12px 0; }
.dual-month-label { font-size:12px; font-weight:600; color:#444; margin-bottom:6px; }
.dual-bars { display:flex; flex-direction:column; gap:4px; }
.stacked-bar { display:flex; height:28px; border-radius:6px; overflow:hidden; margin:12px 0; }
.stacked-seg { height:100%; min-width:2px; }
.legend { display:flex; gap:20px; flex-wrap:wrap; margin:8px 0; font-size:12px; }
.legend-item { display:flex; align-items:center; gap:6px; }
.legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.insight-list { list-style:none; padding:0; }
.insight-list li { padding:10px 14px; margin-bottom:8px; background:#f8f8fc; border-radius:8px; border-left:3px solid var(--accent); font-size:13px; }
.insight-list li.warn { border-left-color:#F04060; background:#fff8f8; }
.alert-box { border:2px solid #F04060; background:#fff8f8; border-radius:10px; padding:16px; margin:16px 0; }
.section-break { page-break-before:always; }
.noprint { }
@media print { .noprint { display:none !important; } body { padding:0; } .page { padding:20px; } h2 { page-break-after:avoid; } }
`;

export function buildBarChart(items, maxVal, maxHeight = 140, fmtEur) {
  if (!items?.length) return "<p style='color:#888'>No data.</p>";
  const max = maxVal || Math.max(...items.map(i => i.value), 1);
  return `<div class="bar-chart">${items.map(item => {
    const h = item.value > 0 ? Math.max(3, Math.round((item.value / max) * maxHeight)) : 0;
    return `<div class="bar-wrap">
      <div class="bar-value">${fmtEur(item.value)}</div>
      <div class="bar" style="height:${h}px;background:${item.color}"></div>
      <div class="bar-label">${esc(item.label)}</div>
    </div>`;
  }).join("")}</div>`;
}

export function buildHorizBars(items, maxVal, fmtEur) {
  if (!items?.length) return "<p style='color:#888'>No data.</p>";
  const max = maxVal || Math.max(...items.map(i => i.value), 1);
  return items.map(item => `
    <div class="horiz-bar-row">
      <div class="horiz-bar-label"><span>${esc(item.label)}</span><span>${item.sub != null ? esc(item.sub) : fmtEur(item.value)}</span></div>
      <div class="horiz-bar-track"><div class="horiz-bar-fill" style="width:${item.value > 0 ? Math.max(1, (item.value / max) * 100) : 0}%;background:${item.color}"></div></div>
    </div>`).join("");
}

function metricCard(label, value, sub, color) {
  return `<div class="metric"><div class="metric-label">${esc(label)}</div>
    <div class="metric-value"${color ? ` style="color:${color}"` : ""}>${esc(value)}</div>
    ${sub != null ? `<div class="metric-sub">${esc(sub)}</div>` : ""}</div>`;
}

function metricsGrid(cards) {
  return `<div class="metrics-grid">${cards.join("")}</div>`;
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td${c.style ? ` style="${c.style}"` : ""}>${c.html}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function cell(text, style) {
  return { html: typeof text === "string" ? esc(text) : text, style };
}

function htmlCell(html, style) {
  return { html: html ?? "", style };
}

const TYPE_COLOR_MAP = {
  SERVICES: "#3B9EFF",
  WAGES: "#F5A623",
  RENT: "#F04060",
  OTHER: "#8A8A9A",
};

function typeBadge(type) {
  const color = TYPE_COLOR_MAP[type] || "#8A8A9A";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${color}22;color:${color}">${esc(type)}</span>`;
}

function statusBadge(status, dueDate, todayFn) {
  const isOverdue = status !== "paid" && dueDate && dueDate < todayFn();
  const config = isOverdue
    ? { color: "#F04060", label: "OVERDUE" }
    : status === "paid"
      ? { color: "#22C97A", label: "PAID" }
      : { color: "#F5A623", label: "PENDING" };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${config.color}22;color:${config.color}">${esc(config.label)}</span>`;
}

function staffStatusBadge(status) {
  const config = {
    active: { color: "#22C97A", label: "Active" },
    part_time: { color: "#3B9EFF", label: "Part-Time" },
    holidays: { color: "#F5A623", label: "On Holidays" },
    sick_leave: { color: "#F04060", label: "Sick Leave" },
  }[status] || { color: "#8A8A9A", label: status };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${config.color}22;color:${config.color}">${esc(config.label)}</span>`;
}

function buildExecutiveSummary(d, fmtEur) {
  const marginColor = d.profitMargin > 30 ? "#22C97A" : d.profitMargin > 10 ? "#F5A623" : "#F04060";
  const base = d.totalRevenue || 1;
  const segs = [
    { label: "Daily costs", value: d.dailyCosts, color: "#F5A623", pct: (d.dailyCosts / base) * 100 },
    { label: "Fixed expenses", value: d.fixedExp, color: "#F04060", pct: (d.fixedExp / base) * 100 },
    { label: "Paid invoices", value: d.paidAmt, color: "#3B9EFF", pct: (d.paidAmt / base) * 100 },
    { label: "Net profit", value: Math.max(0, d.netProfit), color: "#22C97A", pct: Math.max(0, (d.netProfit / base) * 100) },
  ].filter(s => s.value > 0);

  const stacked = segs.map(s =>
    `<div class="stacked-seg" style="width:${s.pct}%;background:${s.color}" title="${esc(s.label)}"></div>`
  ).join("");

  const legend = segs.map(s =>
    `<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${esc(s.label)} ${fmtEur(s.value)}</div>`
  ).join("");

  return `
    <h2>Executive Summary</h2>
    ${metricsGrid([
      metricCard("Total Revenue", fmtEur(d.totalRevenue), null, "#22C97A"),
      metricCard("Total Costs", fmtEur(d.totalCosts), null, "#F04060"),
      metricCard("Net Profit", fmtEur(d.netProfit), null, d.netProfit >= 0 ? "#22C97A" : "#F04060"),
      metricCard("Profit Margin", d.profitMargin.toFixed(1) + "%", null, marginColor),
      metricCard("Days Active", String(d.uniqueDays), null),
      metricCard("Avg Daily Revenue", fmtEur(d.avgDaily), null, "#7C5CFC"),
    ])}
    <h3>Revenue Composition</h3>
    <div class="stacked-bar">${stacked}</div>
    <div class="legend">${legend}</div>`;
}

function buildSalesSection(d, fmtEur, dowShort) {
  const cashPct = d.totalRevenue ? ((d.totalCash / d.totalRevenue) * 100).toFixed(1) : "0";
  const cardPct = d.totalRevenue ? ((d.totalCard / d.totalRevenue) * 100).toFixed(1) : "0";

  const dowBars = d.dowStats.map(stat => ({
    label: stat.day,
    value: stat.avg,
    color: stat.day === d.bestDow?.day ? "#22C97A" : stat.day === d.worstDow?.day ? "#F04060" : "#7C5CFC",
  }));

  const monthMax = Math.max(...d.monthlyCosts.map(m => Math.max(m.rev, m.total)), 1);
  const monthlyDual = d.monthlyCosts.slice().reverse().map(m => `
    <div class="dual-month">
      <div class="dual-month-label">${esc(m.month)}</div>
      <div class="dual-bars">
        <div class="horiz-bar-track" style="height:10px"><div class="horiz-bar-fill" style="width:${(m.rev / monthMax) * 100}%;background:#22C97A"></div></div>
        <div class="horiz-bar-track" style="height:10px"><div class="horiz-bar-fill" style="width:${(m.total / monthMax) * 100}%;background:#F04060"></div></div>
      </div>
    </div>`).join("");

  const monthlyRows = d.monthlySales.map(m => {
    const costs = d.monthlyCosts.find(c => c.month === m.month);
    const net = m.total - (costs?.daily || 0);
    return [
      cell(m.month),
      cell(String(m.days)),
      cell(fmtEur(m.cash), "color:#F5A623"),
      cell(fmtEur(m.card), "color:#3B9EFF"),
      cell(fmtEur(m.total), "font-weight:600"),
      cell(fmtEur(m.daily), "color:#F04060"),
      cell(fmtEur(net), `color:${net >= 0 ? "#22C97A" : "#F04060"};font-weight:600`),
    ];
  });

  const salesLog = [...d.filteredSales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const salesRows = salesLog.map(s => [
    cell(s.date),
    cell(dowShort(s.date)),
    cell(fmtEur(s.cash || 0)),
    cell(fmtEur(s.card || 0)),
    cell(fmtEur((s.cash || 0) + (s.card || 0)), "font-weight:600"),
    cell(fmtEur(s.cash_expenses || 0)),
    cell(s.xpto ? fmtEur(s.xpto) : "—"),
    cell((s.staff || []).join(", ") || "—"),
  ]);

  return `
    <h2 class="section-break">Sales Report</h2>
    ${metricsGrid([
      metricCard("Total Revenue", fmtEur(d.totalRevenue), null, "#22C97A"),
      metricCard("Cash Sales", fmtEur(d.totalCash), cashPct + "% of revenue", "#F5A623"),
      metricCard("Card Sales", fmtEur(d.totalCard), cardPct + "% of revenue", "#3B9EFF"),
      metricCard("Best Day", d.bestDayEntry ? fmtEur(d.bestDayEntry[1]) : "—", d.bestDayEntry?.[0] || "", "#22C97A"),
      metricCard("Worst Day", d.worstDayEntry ? fmtEur(d.worstDayEntry[1]) : "—", d.worstDayEntry?.[0] || "", "#F04060"),
      metricCard("Avg Daily Revenue", fmtEur(d.avgDaily), `${d.uniqueDays} days`, "#7C5CFC"),
    ])}
    <h3>Revenue by Day of Week</h3>
    <div class="chart-section">${buildBarChart(dowBars, Math.max(...dowBars.map(b => b.value), 1), 140, fmtEur)}</div>
    <h3>Monthly Revenue vs Costs</h3>
    <div class="chart-section">
      <div class="legend" style="margin-bottom:12px">
        <div class="legend-item"><span class="legend-dot" style="background:#22C97A"></span>Revenue</div>
        <div class="legend-item"><span class="legend-dot" style="background:#F04060"></span>Costs</div>
      </div>
      ${monthlyDual || "<p style='color:#888'>No monthly data.</p>"}
    </div>
    <h3>Monthly Breakdown</h3>
    ${table(["Month", "Days", "Cash", "Card", "Total", "Daily Costs", "Net"], monthlyRows)}
    <h3>Sales Log${salesLog.length < d.filteredSales.length ? " (last 30)" : ""}</h3>
    ${table(["Date", "Day", "Cash", "Card", "Total", "Costs", "XPTO", "Staff"], salesRows)}`;
}

function buildExpensesSection(d, fmtEur, today) {
  const costRatio = d.totalRevenue ? ((d.totalCosts / d.totalRevenue) * 100).toFixed(1) : "0";
  const typeColors = { SERVICES: "#3B9EFF", WAGES: "#F5A623", RENT: "#F04060", OTHER: "#888888" };
  const typeLabels = { SERVICES: "Services", WAGES: "Wages", RENT: "Rent", OTHER: "Other" };
  const expTypes = ["SERVICES", "WAGES", "RENT", "OTHER"];
  const typeTotals = expTypes.map(t => ({
    label: typeLabels[t],
    value: d.filteredExp.filter(e => e.type === t).reduce((a, e) => a + (e.amount || 0), 0),
    color: typeColors[t],
  })).filter(x => x.value > 0);
  const typeMax = Math.max(...typeTotals.map(t => t.value), 1);
  const typeTotal = typeTotals.reduce((a, t) => a + t.value, 0);

  const typeBars = typeTotals.map(t => ({
    ...t,
    sub: `${fmtEur(t.value)} (${typeTotal ? ((t.value / typeTotal) * 100).toFixed(0) : 0}%)`,
  }));

  const expRows = d.filteredExp.map(e => [
    cell(e.date),
    cell(e.name),
    htmlCell(typeBadge(e.type)),
    cell(fmtEur(e.amount), "color:#F04060;font-weight:600"),
    cell(e.recurring ? "Yes" : "No"),
  ]);

  const invRows = d.filteredInv.map(i => [
    cell(i.date),
    cell(i.due_date || "—"),
    cell(i.supplier_name),
    cell(i.invoice_number ? "#" + i.invoice_number : "—"),
    cell(fmtEur(i.subtotal || 0)),
    cell(fmtEur(i.tax || 0)),
    cell(fmtEur(i.total || 0), "font-weight:600"),
    htmlCell(statusBadge(i.status, i.due_date, today)),
  ]);

  const pendingAlert = d.pendingInv.length > 0 ? `
    <div class="alert-box">
      <strong>⚠ Pending Payments: ${fmtEur(d.pendingAmt)} — ${d.pendingInv.length} invoice(s) awaiting payment</strong>
      <ul style="margin:12px 0 0;padding-left:18px">
        ${d.pendingInv.map(i => {
          const overdue = i.due_date && i.due_date < today();
          return `<li>${esc(i.supplier_name)} · ${fmtEur(i.total || 0)} · Due ${esc(i.due_date || "—")}${overdue ? " <strong>(OVERDUE)</strong>" : ""}</li>`;
        }).join("")}
      </ul>
    </div>` : "";

  return `
    <h2 class="section-break">Expenses Report</h2>
    ${metricsGrid([
      metricCard("Expenses", fmtEur(d.fixedExp), null, "#F04060"),
      metricCard("Paid Invoices", fmtEur(d.paidAmt), null, "#3B9EFF"),
      metricCard("Pending Invoices", fmtEur(d.pendingAmt), null, "#F5A623"),
      metricCard("Daily Costs", fmtEur(d.dailyCosts), null, "#F5A623"),
      metricCard("Grand Total Costs", fmtEur(d.totalCosts), null, "#F04060"),
      metricCard("Cost / Revenue", costRatio + "%", "of total revenue", "#F04060"),
    ])}
    <h3>Expenses by Type</h3>
    <div class="chart-section">${buildHorizBars(typeBars, typeMax, fmtEur)}</div>
    <h3>Monthly Cost Trend</h3>
    <div class="chart-section">
      ${d.monthlyCosts.slice().reverse().map(m => `
        <div class="dual-month">
          <div class="dual-month-label">${esc(m.month)} — Rev ${fmtEur(m.rev)} / Costs ${fmtEur(m.total)}</div>
          <div class="dual-bars">
            <div class="horiz-bar-track" style="height:10px"><div class="horiz-bar-fill" style="width:${m.rev ? Math.min(100, (m.rev / Math.max(...d.monthlyCosts.map(x => x.rev), 1)) * 100) : 0}%;background:#22C97A"></div></div>
            <div class="horiz-bar-track" style="height:10px"><div class="horiz-bar-fill" style="width:${m.total ? Math.min(100, (m.total / Math.max(...d.monthlyCosts.map(x => x.total), 1)) * 100) : 0}%;background:#F04060"></div></div>
          </div>
        </div>`).join("") || "<p style='color:#888'>No monthly data.</p>"}
    </div>
    <h3>Expenses</h3>
    ${table(["Date", "Name", "Type", "Amount", "Recurring"], expRows)}
    <h3>Invoices</h3>
    ${table(["Date", "Due", "Supplier", "Invoice #", "Net", "Tax", "Total", "Status"], invRows)}
    ${pendingAlert}`;
}

function buildStaffSection(d, fmtEur) {
  const totalWorked = d.staffReport.reduce((a, s) => a + s.worked, 0);
  const topAttendance = [...d.staffReport].sort((a, b) => b.rate - a.rate)[0];
  const topRevenue = [...d.staffReport].sort((a, b) => b.rev - a.rev)[0];
  const revMax = Math.max(...d.staffReport.map(s => s.rev), 1);

  const revBars = [...d.staffReport].sort((a, b) => b.rev - a.rev).map((s, i) => ({
    label: s.name,
    value: s.rev,
    color: i === 0 ? "#22C97A" : "#3B9EFF",
    sub: fmtEur(s.rev),
  }));

  const attBars = [...d.staffReport].sort((a, b) => b.rate - a.rate).map(s => ({
    label: s.name,
    value: s.rate,
    color: s.rate >= 90 ? "#22C97A" : s.rate >= 70 ? "#F5A623" : "#F04060",
    sub: s.rate.toFixed(0) + "%",
  }));

  const staffRows = d.staffReport.map(s => [
    cell(s.name, "font-weight:600"),
    cell(s.job_title || "—"),
    htmlCell(staffStatusBadge(s.status || "active")),
    cell(String(s.worked)),
    cell(String(s.missed)),
    cell(s.rate.toFixed(0) + "%", `color:${s.rate >= 90 ? "#22C97A" : s.rate >= 70 ? "#F5A623" : "#F04060"};font-weight:600`),
    cell(fmtEur(s.rev), "color:#F5A623;font-weight:600"),
    cell(fmtEur(s.avgShift)),
  ]);

  const monthlyDetails = d.staffReport.filter(s => s.monthly?.length > 0).map(s => `
    <details style="margin:12px 0">
      <summary style="cursor:pointer;font-weight:600;padding:8px 0">${esc(s.name)} — monthly breakdown</summary>
      ${table(["Month", "Days Worked", "Revenue"], s.monthly.map(([mk, v]) => [
        cell(d.monthLabel ? d.monthLabel(mk + "-01") : mk),
        cell(String(v.days)),
        cell(fmtEur(v.rev), "color:#22C97A"),
      ]))}
    </details>`).join("");

  const absentStaff = d.filteredStaff.filter(s => s.status && s.status !== "active");
  const absenceRows = absentStaff.map(s => {
    const dur = s.status_from && s.status_until
      ? Math.ceil((new Date(s.status_until) - new Date(s.status_from)) / 86400000) + 1 + " days"
      : "—";
    return [
      cell(s.name),
      htmlCell(staffStatusBadge(s.status)),
      cell(s.status_from || "—"),
      cell(s.status_until || "—"),
      cell(dur),
    ];
  });

  return `
    <h2 class="section-break">Staff Report</h2>
    ${metricsGrid([
      metricCard("Total Staff", String(d.filteredStaff.length), null, "#7C5CFC"),
      metricCard("Active", String(d.filteredStaff.filter(s => s.status === "active" || !s.status).length), null, "#22C97A"),
      metricCard("Full Team Days", String(d.fullTeamDays), null, "#22C97A"),
      metricCard("Total Days Worked", String(totalWorked), "across all staff", "#3B9EFF"),
      metricCard("Best Attendance", topAttendance ? topAttendance.name : "—", topAttendance ? topAttendance.rate.toFixed(0) + "%" : "", "#22C97A"),
      metricCard("Most Revenue", topRevenue ? topRevenue.name : "—", topRevenue ? fmtEur(topRevenue.rev) : "", "#F5A623"),
    ])}
    <h3>Revenue Impact per Staff Member</h3>
    <div class="chart-section">${buildHorizBars(revBars, revMax, fmtEur)}</div>
    <h3>Attendance Rate</h3>
    <div class="chart-section">${buildHorizBars(attBars, 100, fmtEur)}</div>
    <h3>Staff Attendance Report</h3>
    ${table(["Name", "Job Title", "Status", "Worked", "Missed", "Attendance", "Revenue", "Avg/Shift"], staffRows)}
    ${monthlyDetails}
    ${absenceRows.length ? `<h3>Current Status / Absences</h3>${table(["Name", "Status", "From", "Until", "Duration"], absenceRows)}` : ""}`;
}

function buildSupplierSection(d, fmtEur) {
  const totalSpend = d.supplierRankings.reduce((a, s) => a + s.spend, 0);
  const paidTotal = d.supplierRankings.reduce((a, s) => a + (s.paid || 0), 0);
  const pendingTotal = d.supplierRankings.reduce((a, s) => a + (s.pendingAmt || 0), 0);
  const spendMax = Math.max(...d.supplierRankings.map(s => s.spend), 1);

  const supplierBars = d.supplierRankings.map((s, i) => ({
    label: s.name,
    value: s.spend,
    color: i === 0 ? "#F5A623" : "#3B9EFF",
    sub: `${fmtEur(s.spend)} (${totalSpend ? ((s.spend / totalSpend) * 100).toFixed(0) : 0}%)`,
  }));

  const supRows = d.supplierRankings.map(s => [
    cell("#" + s.rank),
    cell(s.name, "font-weight:600"),
    cell(String(s.count)),
    cell(String(s.paid)),
    cell(fmtEur(s.pendingAmt), "color:#F5A623"),
    cell(fmtEur(s.spend), "font-weight:600"),
    cell(s.lastDate),
  ]);

  return `
    <h2 class="section-break">Supplier Summary</h2>
    ${metricsGrid([
      metricCard("Total Suppliers", String(d.suppliers?.length ?? d.supplierRankings.length), null, "#7C5CFC"),
      metricCard("Total Spend", fmtEur(totalSpend), null, "#F5A623"),
      metricCard("Paid Invoices", String(paidTotal), "count in range", "#22C97A"),
      metricCard("Pending Amount", fmtEur(pendingTotal), null, "#F04060"),
    ])}
    <h3>Supplier Spend Ranking</h3>
    <div class="chart-section">${buildHorizBars(supplierBars, spendMax, fmtEur)}</div>
    <h3>Supplier Rankings</h3>
    ${table(["Rank", "Supplier", "Invoices", "Paid", "Pending", "Total Spend", "Last Invoice"], supRows)}`;
}

function buildInsightsSection(insights) {
  return `
    <h2 class="section-break">Key Insights</h2>
    <ul class="insight-list">
      ${insights.map(i => `<li${i.startsWith("⚠") ? ' class="warn"' : ""}>${esc(i)}</li>`).join("")}
    </ul>`;
}

export function buildExtendedInsights(base, d, fmtEur, monthLabel) {
  const list = [...base];
  if (d.paidAmt && d.totalRevenue) {
    list.push(`Supplier costs represent ${((d.paidAmt / d.totalRevenue) * 100).toFixed(1)}% of total revenue`);
  }
  const peakMonth = [...d.monthlyTrend].sort((a, b) => b.revenue - a.revenue)[0];
  if (peakMonth) list.push(`Peak revenue month was ${peakMonth.month} at ${fmtEur(peakMonth.revenue)}`);
  const bestShift = [...d.filteredSales].sort((a, b) => ((b.cash || 0) + (b.card || 0)) - ((a.cash || 0) + (a.card || 0)))[0];
  if (bestShift && (bestShift.staff || []).length) {
    list.push(`Shift with highest revenue: ${bestShift.date} (${(bestShift.staff || []).join(", ")}) ${fmtEur((bestShift.cash || 0) + (bestShift.card || 0))}`);
  }
  const expTypes = ["SERVICES", "WAGES", "RENT", "OTHER"];
  const typeLabels = { SERVICES: "Services", WAGES: "Wages", RENT: "Rent", OTHER: "Other" };
  const typeTotals = expTypes.map(t => ({
    type: typeLabels[t],
    amt: d.filteredExp.filter(e => e.type === t).reduce((a, e) => a + (e.amount || 0), 0),
  })).sort((a, b) => b.amt - a.amt);
  const expTotal = typeTotals.reduce((a, t) => a + t.amt, 0);
  if (typeTotals[0]?.amt > 0) {
    list.push(`Largest expense category: ${typeTotals[0].type} at ${fmtEur(typeTotals[0].amt)} (${expTotal ? ((typeTotals[0].amt / expTotal) * 100).toFixed(0) : 0}%)`);
  }
  if (d.totalRevenue) {
    const cashPct = ((d.totalCash / d.totalRevenue) * 100).toFixed(1);
    const cardPct = ((d.totalCard / d.totalRevenue) * 100).toFixed(1);
    list.push(`Card payments dominate at ${cardPct}% — cash at ${cashPct}%`);
  }
  return list;
}

export function buildReportHTML(d, fmtEur, dowShort) {
  const gen = new Date().toLocaleString("en-GB");
  const sections = [];

  if (d.includeFull) sections.push(buildExecutiveSummary(d, fmtEur));
  if (d.includeSales) sections.push(buildSalesSection(d, fmtEur, dowShort));
  if (d.includeExpenses) sections.push(buildExpensesSection(d, fmtEur, d.today));
  if (d.includeStaff) sections.push(buildStaffSection(d, fmtEur));
  if (d.includeFull) {
    sections.push(buildSupplierSection(d, fmtEur));
    sections.push(buildInsightsSection(d.insights));
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.reportTitle)} — ApexManager</title>
<style>${REPORT_CSS}</style></head><body>
<div class="page">
  <div class="noprint" style="margin-bottom:24px">
    <button onclick="window.print()" style="padding:10px 24px;background:#7C5CFC;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">🖨 Print Report</button>
  </div>
  <div class="header">
    <div class="logo">⚡ ApexManager</div>
    <h1 class="report-title">${esc(d.reportTitle)}</h1>
    <div class="meta">
      <strong>Venue:</strong> ${esc(d.venueName)} &nbsp;|&nbsp;
      <strong>Period:</strong> ${esc(d.from)} → ${esc(d.to)}<br>
      <strong>Generated:</strong> ${esc(gen)}
    </div>
  </div>
  ${sections.join("\n")}
  <p style="margin-top:48px;color:#888;font-size:11px;border-top:1px solid #eee;padding-top:16px">ApexManager · Confidential business report</p>
</div></body></html>`;
}
