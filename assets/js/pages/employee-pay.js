/* Employee · Pay */
(function () {
  'use strict';
  const { $, $$, icon, esc, money, num, hours, monthDay, dateLong } = UI;

  function render() {
    const me = Store.me();
    const periods = Store.periods(6);
    const cur = periods[0]; const ep = Store.employeePeriod(me.id, cur);
    const stubs = periods.slice(1).map((p) => ({ p, r: Store.employeePeriod(me.id, p) })).filter((x) => x.r.hours > 0);
    const ytd = stubs.reduce((s, x) => s + x.r.gross, 0) + ep.gross;
    const daysToPay = Store.diffDays(Store.todayStr(), cur.payDate);

    $('#pay').innerHTML = `
      <div class="hero-card pay-card" data-reveal><span class="label">${cur.status === 'paid' ? 'Paid this period' : 'Estimated this period'}</span><div class="big">${money(ep.gross)}</div><div class="row-meta"><span>${icon('calendar-outline')}${monthDay(cur.start)} – ${monthDay(cur.end)}</span><span>${icon('cash-outline')}${cur.status === 'paid' ? 'Paid' : `Pay day in ${daysToPay} day${daysToPay === 1 ? '' : 's'}`}</span></div><div class="chip-row"><div class="kv">Hours<b>${num(ep.hours, 1)}h</b></div><div class="kv">Rate<b>${money(ep.rate)}/h</b></div><div class="kv">Overtime<b>${num(ep.overtime, 1)}h</b></div><div class="kv">Est. net<b>${money(ep.net, { cents: false })}</b></div></div></div>
      <div class="grid grid-2" style="gap:10px" data-reveal><div class="card stat-mini"><span class="l">Year to date</span><span class="v">${money(ytd, { cents: false })}</span></div><div class="card stat-mini"><span class="l">Next pay date</span><span class="v">${dateLong(cur.payDate, { weekday: false })}</span></div></div>
      <div class="section-title" data-reveal><h2>Pay stubs</h2><span class="text-sm subtle">${stubs.length} available</span></div>
      <div class="card stub-list" data-reveal><div class="list">${stubs.map((x, i) => `<div class="list-item" data-i="${i}"><span class="list-icon green">${icon('receipt-outline')}</span><div class="grow"><div class="t">${monthDay(x.p.start)} – ${monthDay(x.p.end)}</div><div class="d">${num(x.r.hours, 1)}h · paid ${dateLong(x.p.payDate, { weekday: false })}</div></div><div class="end"><div class="amount">${money(x.r.net)}</div><div class="text-xs subtle">net</div></div></div>`).join('')}</div></div>
      <div class="card" data-reveal><div class="card-body"><div class="row gap-10"><span class="list-icon blue">${icon('card-outline')}</span><div class="grow"><div class="strong text-sm">Direct deposit</div><div class="text-xs subtle">Chase Bank ····4821</div></div><button class="btn btn-ghost btn-sm" id="editBank">Edit</button></div></div></div>`;
    $$('.stub-list [data-i]').forEach((n) => n.addEventListener('click', () => stub(stubs[Number(n.dataset.i)])));
    $('#editBank').addEventListener('click', () => UI.toast('Bank details are managed by HR in the demo', { type: 'info' }));
    UI.reveal();
  }

  function stub({ p, r }) {
    EmpShell.sheet({ title: 'Pay stub', sub: `${monthDay(p.start)} – ${monthDay(p.end)} · paid ${dateLong(p.payDate, { weekday: false })}`, body: `
      <div class="hero-card" style="padding:16px;margin-bottom:14px"><span class="label">Net pay</span><div class="big" style="font-size:30px">${money(r.net)}</div><div class="row-meta"><span>${icon('time-outline')}${num(r.hours, 2)} hours</span><span>${icon('cash-outline')}${money(r.rate)}/h</span></div></div>
      <div class="upper mb-8">Earnings</div>
      <div class="stub-row"><span>Regular · ${num(r.regular, 2)}h</span><b class="num">${money(r.regular * r.rate)}</b></div>
      <div class="stub-row"><span>Overtime · ${num(r.overtime, 2)}h × 1.5</span><b class="num">${money(r.overtime * r.rate * 1.5)}</b></div>
      <div class="stub-row"><span>Gross pay</span><b class="num">${money(r.gross)}</b></div>
      <div class="upper mb-8 mt-16">Deductions</div>
      <div class="stub-row"><span>Federal income tax</span><span class="num">−${money(r.gross * 0.12)}</span></div>
      <div class="stub-row"><span>Social security &amp; Medicare</span><span class="num">−${money(r.gross * 0.0765)}</span></div>
      <div class="stub-row"><span>State tax</span><span class="num">−${money(r.gross * 0.0155)}</span></div>
      <div class="stub-row total"><span>Net pay</span><span class="num" style="color:var(--green-600)">${money(r.net)}</span></div>`, footer: `<button class="btn btn-primary btn-lg btn-block" id="dlStub">${icon('download-outline')}Download PDF</button>` });
    $('#dlStub').addEventListener('click', () => UI.toast('Pay stub downloaded', { icon: 'download-outline' }));
  }
  document.addEventListener('DOMContentLoaded', () => { render(); Store.onChange(() => render()); });
})();
