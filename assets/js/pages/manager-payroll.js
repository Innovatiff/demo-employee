/* Manager · Payroll */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, money, num, hours, monthDay, dateLong, positionBadge, statusBadge } = UI;
  const periods = Store.periods(8);
  const state = { idx: 0, q: '' };
  const period = () => Store.periods(8)[state.idx];
  const summary = () => Store.periodSummary(period());

  // Synthesize gross for periods older than the seeded data (deterministic)
  function grossFor(p, i) {
    const s = Store.periodSummary(p);
    if (s.total.hours > 0 && i <= 2) return s.total.gross;
    const base = Store.periodSummary(Store.periods(2)[1]).total.gross || 20000;
    const r = Store.rng(Store.hash(p.start))();
    return base * (0.9 + r * 0.2);
  }

  function kpis() {
    const s = summary(); const p = period();
    const tiles = [
      { icon: 'cash-outline', tone: 'green', label: 'Gross pay', value: s.total.gross, format: (v) => money(v, { cents: false }), foot: p.current ? 'so far this period' : `paid ${dateLong(p.payDate, { weekday: false })}` },
      { icon: 'time-outline', tone: 'blue', label: 'Total hours', value: s.total.hours, format: (v) => `${num(v, 0)}h`, foot: `${num(s.total.regular, 0)}h regular` },
      { icon: 'flash-outline', tone: s.total.overtime > 0 ? 'amber' : 'gray', label: 'Overtime hours', value: s.total.overtime, format: (v) => `${num(v, 1)}h`, foot: `paid at 1.5× after ${Store.data.company.overtimeAfter}h/week` },
      { icon: 'people-outline', tone: 'violet', label: 'Employees paid', value: s.employees, foot: `net pay ${money(s.total.net, { cents: false })}` },
    ];
    $('#kpis').innerHTML = '';
    tiles.forEach((t) => { const c = el(`<div class="card card-hover stat is-in"><div class="stat-top"><span class="stat-icon ${t.tone}">${icon(t.icon)}</span></div><div><div class="stat-label">${esc(t.label)}</div><div class="stat-value"><span class="v">0</span></div></div><div class="stat-foot"><span>${esc(t.foot)}</span></div></div>`); $('#kpis').appendChild(c); UI.countUp($('.v', c), t.value, { format: t.format }); });
  }

  function header() {
    const p = period();
    $('#periodLabel').textContent = `${monthDay(p.start)} – ${monthDay(p.end)}${p.current ? ' · Current' : ''}`;
    $('#pageSub').textContent = `${Store.data.company.payFrequency} · ${p.status === 'paid' ? 'Paid on' : 'Pay date'} ${dateLong(p.payDate, { weekday: true })}`;
    const paid = p.status === 'paid';
    $('#btnRun').innerHTML = paid ? `${icon('checkmark-circle-outline')}Payroll complete` : `${icon('play-outline')}Run payroll`;
    $('#btnRun').classList.toggle('btn-success', paid); $('#btnRun').classList.toggle('btn-primary', !paid); $('#btnRun').disabled = paid;
    $('#tableTitle').textContent = paid ? 'Pay run' : 'Pay preview';
    $('#tableSub').textContent = `${monthDay(p.start)} – ${monthDay(p.end)}, ${Store.parseDate(p.end).getFullYear()}`;
  }

  function charts() {
    const list = Store.periods(9).slice(1).reverse(); // completed periods only
    const values = list.map((p, i) => grossFor(p, list.length - i));
    UI.charts.area($('#costChart'), { labels: list.map((p) => monthDay(p.start)), values, color: '#2563EB', height: 230, format: (v) => money(v, { cents: false }), yFormat: (v) => money(v, { compact: true, cents: false }) });
    const s = summary();
    const byPos = {};
    s.rows.forEach((r) => { const p = Store.position(r.employee.positionId); byPos[p.id] = byPos[p.id] || { label: p.name, color: p.color, value: 0 }; byPos[p.id].value += r.gross; });
    const segs = Object.values(byPos).filter((x) => x.value > 0).sort((a, b) => b.value - a.value).map((x) => ({ ...x, value: Math.round(x.value) }));
    if (!segs.length) { $('#posDonut').innerHTML = `<div class="empty">${icon('pie-chart-outline')}<div class="t">No hours yet</div></div>`; return; }
    UI.charts.donut($('#posDonut'), { segments: segs, centerValue: money(s.total.gross, { compact: true, cents: false }), centerLabel: 'gross' });
    $$('#posDonut .donut-legend .v').forEach((v, i) => (v.textContent = money(segs[i].value, { cents: false })));
  }

  function table() {
    const s = summary(); const p = period();
    const rows = s.rows.filter((r) => !state.q || r.employee.name.toLowerCase().includes(state.q)).sort((a, b) => b.gross - a.gross);
    $('#payTable tbody').innerHTML = rows.map((r) => `<tr class="clickable" data-id="${r.employee.id}"><td><div class="person">${avatar(r.employee, 'md')}<div><div class="name">${esc(r.employee.name)}</div><div class="meta">${r.employee.id} · ${esc(r.employee.type)}</div></div></div></td><td>${positionBadge(Store.position(r.employee.positionId))}</td><td class="right num">${num(r.regular, 1)}h</td><td class="right num">${r.overtime ? `<span style="color:var(--amber-600);font-weight:600">${num(r.overtime, 1)}h</span>` : '<span class="subtle">—</span>'}</td><td class="right num">${money(r.rate)}</td><td class="right num strong">${money(r.gross)}</td><td class="right num">${money(r.net)}</td><td>${statusBadge(p.status === 'paid' ? 'paid' : 'open')}</td><td class="right"><button class="icon-btn sm" aria-label="Pay stub">${icon('receipt-outline')}</button></td></tr>`).join('') || `<tr><td colspan="9"><div class="empty">${icon('search-outline')}<div class="t">No matches</div></div></td></tr>`;
    $$('#payTable tr[data-id]').forEach((tr) => tr.addEventListener('click', () => stub(tr.dataset.id)));
    $('#footNote').textContent = `${rows.length} employees · ${money(rows.reduce((a, r) => a + r.gross, 0))} gross`;
  }

  function stub(empId) {
    const p = period(); const r = Store.employeePeriod(empId, p); const e = r.employee;
    const body = `<div class="row" style="gap:14px;margin-bottom:18px">${avatar(e, 'lg')}<div><div class="strong" style="font-size:15px">${esc(e.name)}</div><div class="muted text-sm">${esc(Store.position(e.positionId).name)} · ${e.id}</div></div><span style="margin-left:auto">${statusBadge(p.status === 'paid' ? 'paid' : 'open')}</span></div>
      <div class="detail-grid mb-16"><div class="detail"><span class="k">Pay period</span><span class="v">${monthDay(p.start)} – ${monthDay(p.end)}</span></div><div class="detail"><span class="k">Pay date</span><span class="v">${dateLong(p.payDate, { weekday: false, year: true })}</span></div></div>
      <div class="upper mb-8">Earnings</div>
      <div class="stub-row"><span>Regular · ${num(r.regular, 2)}h × ${money(r.rate)}</span><b class="num">${money(r.regular * r.rate)}</b></div>
      <div class="stub-row"><span>Overtime · ${num(r.overtime, 2)}h × ${money(r.rate * 1.5)}</span><b class="num">${money(r.overtime * r.rate * 1.5)}</b></div>
      <div class="stub-row"><span>Gross pay</span><b class="num">${money(r.gross)}</b></div>
      <div class="upper mb-8 mt-16">Deductions</div>
      <div class="stub-row"><span>Federal income tax</span><span class="num">−${money(r.gross * 0.12)}</span></div>
      <div class="stub-row"><span>Social security &amp; Medicare</span><span class="num">−${money(r.gross * 0.0765)}</span></div>
      <div class="stub-row"><span>State tax</span><span class="num">−${money(r.gross * 0.0155)}</span></div>
      <div class="stub-row total"><span>Net pay</span><span class="num" style="color:var(--green-600)">${money(r.net)}</span></div>`;
    UI.modal({ title: 'Pay stub', body, footer: `<button class="btn btn-secondary" data-close>Close</button><button class="btn btn-primary" id="dl">${icon('download-outline')}Download PDF</button>` });
    $('#dl').addEventListener('click', () => UI.toast(`Pay stub for ${e.first} downloaded`, { icon: 'download-outline' }));
  }

  function periodMenu() {
    UI.menu($('#periodBtn'), Store.periods(8).map((p, i) => ({ label: `${monthDay(p.start)} – ${monthDay(p.end)}${p.current ? ' (current)' : ''}`, icon: p.status === 'paid' ? 'checkmark-circle-outline' : 'time-outline', active: i === state.idx, onClick: () => { state.idx = i; render(); } })), { align: 'left' });
  }

  function runPayroll() {
    const s = summary(); const p = period();
    const steps = ['Calculating hours & overtime', 'Applying rates and deductions', 'Generating pay stubs', 'Submitting direct deposits'];
    const m = UI.modal({ title: 'Run payroll', sub: `${monthDay(p.start)} – ${monthDay(p.end)} · ${s.employees} employees · ${money(s.total.gross, { cents: false })} gross`, body: `<div class="run-steps">${steps.map((t, i) => `<div class="run-step" data-step="${i}"><span class="ico">${icon('ellipse-outline')}</span><span>${t}</span></div>`).join('')}</div>`, footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="startRun">${icon('play-outline')}Start run</button>`, closeOnBackdrop: false });
    $('#startRun', m.el).addEventListener('click', () => {
      $('#startRun', m.el).disabled = true; $('#startRun', m.el).innerHTML = '<span class="spinner"></span>Running…'; $('[data-close]', m.foot).disabled = true;
      steps.forEach((_, i) => {
        setTimeout(() => { const st = $(`[data-step="${i}"]`, m.el); st.classList.add('active'); $('.ico', st).innerHTML = '<span class="spinner" style="width:14px;height:14px"></span>'; }, i * 750);
        setTimeout(() => { const st = $(`[data-step="${i}"]`, m.el); st.classList.remove('active'); st.classList.add('done'); $('.ico', st).innerHTML = icon('checkmark-outline'); }, i * 750 + 650);
      });
      setTimeout(() => {
        Store.runPayroll(p);
        m.body.innerHTML = `<div class="run-done"><div class="big">${icon('checkmark-outline')}</div><h3 style="font-size:20px">Payroll complete</h3><p class="muted mt-8">${s.employees} employees will be paid ${money(s.total.net, { cents: false })} on ${dateLong(p.payDate, { weekday: false })}.<br>Pay stubs are now available in the employee app.</p></div>`;
        m.foot.innerHTML = `<button class="btn btn-primary" data-close>Done</button>`;
        UI.toast('Payroll submitted successfully'); render();
      }, steps.length * 750 + 300);
    });
  }

  function render() { header(); kpis(); charts(); table(); }

  document.addEventListener('DOMContentLoaded', () => {
    render(); UI.reveal();
    $('#periodBtn').addEventListener('click', (e) => { e.stopPropagation(); periodMenu(); });
    $('#btnRun').addEventListener('click', runPayroll);
    $('#btnExport').addEventListener('click', () => UI.toast('Payroll register exported as CSV', { icon: 'download-outline' }));
    $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); table(); });
    Store.onChange((src) => { if (src === 'remote') render(); });
  });
})();
