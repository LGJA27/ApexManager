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

function statusBadge(status, dueDate, todayFn, L) {
  const isOverdue = status !== "paid" && dueDate && dueDate < todayFn();
  const config = isOverdue
    ? { color: "#F04060", label: L.overdue.toUpperCase() }
    : status === "paid"
      ? { color: "#22C97A", label: L.paid.toUpperCase() }
      : { color: "#F5A623", label: L.pending.toUpperCase() };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${config.color}22;color:${config.color}">${esc(config.label)}</span>`;
}

function staffStatusBadge(status, L) {
  const config = {
    active: { color: "#22C97A", label: L.staffActive || "Active" },
    part_time: { color: "#3B9EFF", label: L.staffPartTime || "Part-Time" },
    holidays: { color: "#F5A623", label: L.staffHolidays || "On Holidays" },
    sick_leave: { color: "#F04060", label: L.staffSickLeave || "Sick Leave" },
  }[status] || { color: "#8A8A9A", label: status };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${config.color}22;color:${config.color}">${esc(config.label)}</span>`;
}

function getReportLabels(lang) {
  return lang === "pt" ? {
    title: "Relatório de Auditoria",
    executiveSummary: "Resumo Executivo",
    salesSummary: "Resumo de Vendas",
    expensesSection: "Despesas",
    staffSection: "Equipa",
    suppliersSection: "Fornecedores",
    keyInsights: "Análises Principais",
    generatedOn: "Gerado em",
    period: "Período",
    venue: "Estabelecimento",
    revenue: "Receita",
    costs: "Custos",
    profit: "Lucro",
    margin: "Margem",
    days: "Dias",
    name: "Nome",
    daysWorked: "Dias Trabalhados",
    attendance: "Presença",
    revenueOnShifts: "Receita nos Turnos",
    print: "🖨 Imprimir Relatório",
    paid: "Pago",
    pending: "Pendente",
    overdue: "Em Atraso",
    month: "Mês",
    supplier: "Fornecedor",
    invoices: "Faturas",
    spend: "Gasto",
    confidential: "ApexManager · Relatório empresarial confidencial",
    totalRevenue: "Receita Total",
    totalCosts: "Custos Totais",
    netProfit: "Lucro Líquido",
    profitMargin: "Margem de Lucro",
    daysActive: "Dias Ativos",
    avgDailyRevenue: "Média Diária",
    revenueComposition: "Composição da Receita",
    dailyCosts: "Custos diários",
    fixedExpenses: "Despesas fixas",
    paidInvoices: "Faturas pagas",
    cashSales: "Vendas Numerário",
    cardSales: "Vendas Cartão",
    bestDay: "Melhor Dia",
    worstDay: "Pior Dia",
    revenueByDow: "Receita por Dia da Semana",
    monthlyRevVsCosts: "Receita Mensal vs Custos",
    monthlyBreakdown: "Análise Mensal",
    salesLog: "Registo de Vendas",
    expensesReport: "Relatório de Despesas",
    pendingPayments: "Pagamentos Pendentes",
    expensesByType: "Despesas por Tipo",
    monthlyCostTrend: "Tendência de Custos Mensais",
    date: "Data",
    day: "Dia",
    cash: "Numerário",
    card: "Cartão",
    total: "Total",
    net: "Líquido",
    tax: "IVA",
    status: "Estado",
    due: "Vencimento",
    recurring: "Recorrente",
    amount: "Valor",
    type: "Tipo",
    rank: "Pos.",
    lastInvoice: "Última Fatura",
    staff: "Equipa",
    staffActive: "Ativo",
    staffHolidays: "De Férias",
    staffSickLeave: "Baixa Médica",
    totalStaff: "Total Equipa",
    fullTeamDays: "Dias Equipa Completa",
    bestAttendance: "Melhor Presença",
    mostRevenue: "Mais Receita",
    revenueImpact: "Impacto de Receita por Membro",
    attendanceRate: "Taxa de Presença",
    staffAttendanceReport: "Relatório de Presenças",
    jobTitle: "Função",
    worked: "Trabalhados",
    missed: "Faltas",
    avgShift: "Média/Turno",
    absences: "Ausências Atuais",
    from: "De",
    until: "Até",
    duration: "Duração",
    totalSuppliers: "Total Fornecedores",
    totalSpend: "Gasto Total",
    pendingAmount: "Valor Pendente",
    supplierRanking: "Ranking de Fornecedores",
    noData: "Sem dados.",
  } : {
    title: "Audit Report",
    executiveSummary: "Executive Summary",
    salesSummary: "Sales Summary",
    expensesSection: "Expenses",
    staffSection: "Staff Report",
    suppliersSection: "Supplier Summary",
    keyInsights: "Key Insights",
    generatedOn: "Generated on",
    period: "Period",
    venue: "Venue",
    revenue: "Revenue",
    costs: "Costs",
    profit: "Profit",
    margin: "Margin",
    days: "Days",
    name: "Name",
    daysWorked: "Days Worked",
    attendance: "Attendance",
    revenueOnShifts: "Revenue on Shifts",
    print: "🖨 Print Report",
    paid: "Paid",
    pending: "Pending",
    overdue: "Overdue",
    month: "Month",
    supplier: "Supplier",
    invoices: "Invoices",
    spend: "Spend",
    confidential: "ApexManager · Confidential business report",
    totalRevenue: "Total Revenue",
    totalCosts: "Total Costs",
    netProfit: "Net Profit",
    profitMargin: "Profit Margin",
    daysActive: "Days Active",
    avgDailyRevenue: "Avg Daily Revenue",
    revenueComposition: "Revenue Composition",
    dailyCosts: "Daily costs",
    fixedExpenses: "Fixed expenses",
    paidInvoices: "Paid invoices",
    cashSales: "Cash Sales",
    cardSales: "Card Sales",
    bestDay: "Best Day",
    worstDay: "Worst Day",
    revenueByDow: "Revenue by Day of Week",
    monthlyRevVsCosts: "Monthly Revenue vs Costs",
    monthlyBreakdown: "Monthly Breakdown",
    salesLog: "Sales Log",
    expensesReport: "Expenses Report",
    pendingPayments: "Pending Payments",
    expensesByType: "Expenses by Type",
    monthlyCostTrend: "Monthly Cost Trend",
    date: "Date",
    day: "Day",
    cash: "Cash",
    card: "Card",
    total: "Total",
    net: "Net",
    tax: "Tax",
    status: "Status",
    due: "Due",
    recurring: "Recurring",
    amount: "Amount",
    type: "Type",
    rank: "Rank",
    lastInvoice: "Last Invoice",
    staff: "Staff",
    staffActive: "Active",
    staffHolidays: "On Holidays",
    staffSickLeave: "Sick Leave",
    totalStaff: "Total Staff",
    fullTeamDays: "Full Team Days",
    bestAttendance: "Best Attendance",
    mostRevenue: "Most Revenue",
    revenueImpact: "Revenue Impact per Staff Member",
    attendanceRate: "Attendance Rate",
    staffAttendanceReport: "Staff Attendance Report",
    jobTitle: "Job Title",
    worked: "Worked",
    missed: "Missed",
    avgShift: "Avg/Shift",
    absences: "Current Status / Absences",
    from: "From",
    until: "Until",
    duration: "Duration",
    totalSuppliers: "Total Suppliers",
    totalSpend: "Total Spend",
    pendingAmount: "Pending Amount",
    supplierRanking: "Supplier Spend Ranking",
    noData: "No data.",
  };
}

function buildExecutiveSummary(d, fmtEur, L) {
  const marginColor = d.profitMargin > 30 ? "#22C97A" : d.profitMargin > 10 ? "#F5A623" : "#F04060";
  const base = d.totalRevenue || 1;
  const segs = [
    { label: L.dailyCosts, value: d.dailyCosts, color: "#F5A623", pct: (d.dailyCosts / base) * 100 },
    { label: L.fixedExpenses, value: d.fixedExp, color: "#F04060", pct: (d.fixedExp / base) * 100 },
    { label: L.paidInvoices, value: d.paidAmt, color: "#3B9EFF", pct: (d.paidAmt / base) * 100 },
    { label: L.netProfit, value: Math.max(0, d.netProfit), color: "#22C97A", pct: Math.max(0, (d.netProfit / base) * 100) },
  ].filter(s => s.value > 0);

  const stacked = segs.map(s =>
    `<div class="stacked-seg" style="width:${s.pct}%;background:${s.color}" title="${esc(s.label)}"></div>`
  ).join("");

  const legend = segs.map(s =>
    `<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${esc(s.label)} ${fmtEur(s.value)}</div>`
  ).join("");

  return `
    <h2>${esc(L.executiveSummary)}</h2>
    ${metricsGrid([
      metricCard(L.totalRevenue, fmtEur(d.totalRevenue), null, "#22C97A"),
      metricCard(L.totalCosts, fmtEur(d.totalCosts), null, "#F04060"),
      metricCard(L.netProfit, fmtEur(d.netProfit), null, d.netProfit >= 0 ? "#22C97A" : "#F04060"),
      metricCard(L.profitMargin, d.profitMargin.toFixed(1) + "%", null, marginColor),
      metricCard(L.daysActive, String(d.uniqueDays), null),
      metricCard(L.avgDailyRevenue, fmtEur(d.avgDaily), null, "#7C5CFC"),
    ])}
    <h3>${esc(L.revenueComposition)}</h3>
    <div class="stacked-bar">${stacked}</div>
    <div class="legend">${legend}</div>`;
}

function buildSalesSection(d, fmtEur, dowShort, L) {
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
    <h2 class="section-break">${esc(L.salesSummary)}</h2>
    ${metricsGrid([
      metricCard(L.totalRevenue, fmtEur(d.totalRevenue), null, "#22C97A"),
      metricCard(L.cashSales, fmtEur(d.totalCash), cashPct + "%", "#F5A623"),
      metricCard(L.cardSales, fmtEur(d.totalCard), cardPct + "%", "#3B9EFF"),
      metricCard(L.bestDay, d.bestDayEntry ? fmtEur(d.bestDayEntry[1]) : "—", d.bestDayEntry?.[0] || "", "#22C97A"),
      metricCard(L.worstDay, d.worstDayEntry ? fmtEur(d.worstDayEntry[1]) : "—", d.worstDayEntry?.[0] || "", "#F04060"),
      metricCard(L.avgDailyRevenue, fmtEur(d.avgDaily), `${d.uniqueDays} ${L.days.toLowerCase()}`, "#7C5CFC"),
    ])}
    <h3>${esc(L.revenueByDow)}</h3>
    <div class="chart-section">${buildBarChart(dowBars, Math.max(...dowBars.map(b => b.value), 1), 140, fmtEur)}</div>
    <h3>${esc(L.monthlyRevVsCosts)}</h3>
    <div class="chart-section">
      <div class="legend" style="margin-bottom:12px">
        <div class="legend-item"><span class="legend-dot" style="background:#22C97A"></span>${esc(L.revenue)}</div>
        <div class="legend-item"><span class="legend-dot" style="background:#F04060"></span>${esc(L.costs)}</div>
      </div>
      ${monthlyDual || `<p style='color:#888'>${esc(L.noData)}</p>`}
    </div>
    <h3>${esc(L.monthlyBreakdown)}</h3>
    ${table([L.month, L.days, L.cash, L.card, L.total, L.dailyCosts, L.net], monthlyRows)}
    <h3>${esc(L.salesLog)}${salesLog.length < d.filteredSales.length ? " (last 30)" : ""}</h3>
    ${table([L.date, L.day, L.cash, L.card, L.total, L.costs, "XPTO", L.staff], salesRows)}`;
}

function buildExpensesSection(d, fmtEur, today, L) {
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
    htmlCell(statusBadge(i.status, i.due_date, today, L)),
  ]);

  const pendingAlert = d.pendingInv.length > 0 ? `
    <div class="alert-box">
      <strong>⚠ ${L.pendingPayments}: ${fmtEur(d.pendingAmt)} — ${d.pendingInv.length} ${L.invoices.toLowerCase()}</strong>
      <ul style="margin:12px 0 0;padding-left:18px">
        ${d.pendingInv.map(i => {
          const overdue = i.due_date && i.due_date < today();
          return `<li>${esc(i.supplier_name)} · ${fmtEur(i.total || 0)} · ${L.due} ${esc(i.due_date || "—")}${overdue ? ` <strong>(${L.overdue.toUpperCase()})</strong>` : ""}</li>`;
        }).join("")}
      </ul>
    </div>` : "";

  return `
    <h2 class="section-break">${esc(L.expensesReport)}</h2>
    ${metricsGrid([
      metricCard(L.expensesSection, fmtEur(d.fixedExp), null, "#F04060"),
      metricCard(L.paidInvoices, fmtEur(d.paidAmt), null, "#3B9EFF"),
      metricCard(L.pendingAmount, fmtEur(d.pendingAmt), null, "#F5A623"),
      metricCard(L.dailyCosts, fmtEur(d.dailyCosts), null, "#F5A623"),
      metricCard(L.totalCosts, fmtEur(d.totalCosts), null, "#F04060"),
      metricCard(L.margin, costRatio + "%", L.revenue.toLowerCase(), "#F04060"),
    ])}
    <h3>${esc(L.expensesByType)}</h3>
    <div class="chart-section">${buildHorizBars(typeBars, typeMax, fmtEur)}</div>
    <h3>${esc(L.monthlyCostTrend)}</h3>
    <div class="chart-section">
      ${d.monthlyCosts.slice().reverse().map(m => `
        <div class="dual-month">
          <div class="dual-month-label">${esc(m.month)} — ${L.revenue} ${fmtEur(m.rev)} / ${L.costs} ${fmtEur(m.total)}</div>
          <div class="dual-bars">
            <div class="horiz-bar-track" style="height:10px"><div class="horiz-bar-fill" style="width:${m.rev ? Math.min(100, (m.rev / Math.max(...d.monthlyCosts.map(x => x.rev), 1)) * 100) : 0}%;background:#22C97A"></div></div>
            <div class="horiz-bar-track" style="height:10px"><div class="horiz-bar-fill" style="width:${m.total ? Math.min(100, (m.total / Math.max(...d.monthlyCosts.map(x => x.total), 1)) * 100) : 0}%;background:#F04060"></div></div>
          </div>
        </div>`).join("") || `<p style='color:#888'>${esc(L.noData)}</p>`}
    </div>
    <h3>${esc(L.expensesSection)}</h3>
    ${table([L.date, L.name, L.type, L.amount, L.recurring], expRows)}
    <h3>${esc(L.invoices)}</h3>
    ${table([L.date, L.due, L.supplier, "#", L.net, L.tax, L.total, L.status], invRows)}
    ${pendingAlert}`;
}

function buildStaffSection(d, fmtEur, L) {
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
    htmlCell(staffStatusBadge(s.status || "active", L)),
    cell(String(s.worked)),
    cell(String(s.missed)),
    cell(s.rate.toFixed(0) + "%", `color:${s.rate >= 90 ? "#22C97A" : s.rate >= 70 ? "#F5A623" : "#F04060"};font-weight:600`),
    cell(fmtEur(s.rev), "color:#F5A623;font-weight:600"),
    cell(fmtEur(s.avgShift)),
  ]);

  const monthlyDetails = d.staffReport.filter(s => s.monthly?.length > 0).map(s => `
    <details style="margin:12px 0">
      <summary style="cursor:pointer;font-weight:600;padding:8px 0">${esc(s.name)} — monthly breakdown</summary>
      ${table([L.month, L.daysWorked, L.revenue], s.monthly.map(([mk, v]) => [
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
      htmlCell(staffStatusBadge(s.status, L)),
      cell(s.status_from || "—"),
      cell(s.status_until || "—"),
      cell(dur),
    ];
  });

  return `
    <h2 class="section-break">${esc(L.staffSection)}</h2>
    ${metricsGrid([
      metricCard(L.totalStaff, String(d.filteredStaff.length), null, "#7C5CFC"),
      metricCard(L.staffActive, String(d.filteredStaff.filter(s => s.status === "active" || !s.status).length), null, "#22C97A"),
      metricCard(L.fullTeamDays, String(d.fullTeamDays), null, "#22C97A"),
      metricCard(L.daysWorked, String(totalWorked), L.staff.toLowerCase(), "#3B9EFF"),
      metricCard(L.bestAttendance, topAttendance ? topAttendance.name : "—", topAttendance ? topAttendance.rate.toFixed(0) + "%" : "", "#22C97A"),
      metricCard(L.mostRevenue, topRevenue ? topRevenue.name : "—", topRevenue ? fmtEur(topRevenue.rev) : "", "#F5A623"),
    ])}
    <h3>${esc(L.revenueImpact)}</h3>
    <div class="chart-section">${buildHorizBars(revBars, revMax, fmtEur)}</div>
    <h3>${esc(L.attendanceRate)}</h3>
    <div class="chart-section">${buildHorizBars(attBars, 100, fmtEur)}</div>
    <h3>${esc(L.staffAttendanceReport)}</h3>
    ${table([L.name, L.jobTitle, L.status, L.worked, L.missed, L.attendance, L.revenue, L.avgShift], staffRows)}
    ${monthlyDetails}
    ${absenceRows.length ? `<h3>${esc(L.absences)}</h3>${table([L.name, L.status, L.from, L.until, L.duration], absenceRows)}` : ""}`;
}

function buildSupplierSection(d, fmtEur, L) {
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
    <h2 class="section-break">${esc(L.suppliersSection)}</h2>
    ${metricsGrid([
      metricCard(L.totalSuppliers, String(d.suppliers?.length ?? d.supplierRankings.length), null, "#7C5CFC"),
      metricCard(L.totalSpend, fmtEur(totalSpend), null, "#F5A623"),
      metricCard(L.paidInvoices, String(paidTotal), L.invoices.toLowerCase(), "#22C97A"),
      metricCard(L.pendingAmount, fmtEur(pendingTotal), null, "#F04060"),
    ])}
    <h3>${esc(L.supplierRanking)}</h3>
    <div class="chart-section">${buildHorizBars(supplierBars, spendMax, fmtEur)}</div>
    <h3>${esc(L.suppliersSection)}</h3>
    ${table([L.rank, L.supplier, L.invoices, L.paid, L.pending, L.spend, L.lastInvoice], supRows)}`;
}

function buildInsightsSection(insights, L) {
  return `
    <h2 class="section-break">${esc(L.keyInsights)}</h2>
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

export function buildReportHTML(d, fmtEur, dowShort, lang = "en") {
  const L = getReportLabels(lang);
  const locale = lang === "pt" ? "pt-PT" : "en-GB";
  const gen = new Date().toLocaleString(locale);
  const sections = [];

  if (d.includeFull) sections.push(buildExecutiveSummary(d, fmtEur, L));
  if (d.includeSales) sections.push(buildSalesSection(d, fmtEur, dowShort, L));
  if (d.includeExpenses) sections.push(buildExpensesSection(d, fmtEur, d.today, L));
  if (d.includeStaff) sections.push(buildStaffSection(d, fmtEur, L));
  if (d.includeFull) {
    sections.push(buildSupplierSection(d, fmtEur, L));
    sections.push(buildInsightsSection(d.insights, L));
  }

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.reportTitle)} — ApexManager</title>
<style>${REPORT_CSS}</style></head><body>
<div class="page">
  <div class="noprint" style="margin-bottom:24px">
    <button onclick="window.print()" style="padding:10px 24px;background:#7C5CFC;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">${L.print}</button>
  </div>
  <div class="header">
    <div class="logo">⚡ ApexManager</div>
    <h1 class="report-title">${esc(d.reportTitle)}</h1>
    <div class="meta">
      <strong>${esc(L.venue)}:</strong> ${esc(d.venueName)} &nbsp;|&nbsp;
      <strong>${esc(L.period)}:</strong> ${esc(d.from)} → ${esc(d.to)}<br>
      <strong>${esc(L.generatedOn)}:</strong> ${esc(gen)}
    </div>
  </div>
  ${sections.join("\n")}
  <p style="margin-top:48px;color:#888;font-size:11px;border-top:1px solid #eee;padding-top:16px">${esc(L.confidential)}</p>
</div></body></html>`;
}
