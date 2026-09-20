/* Employee · Hours */
(function () {
  'use strict';
  const { $, $$, icon, esc, hours, hm, time } = UI;
  const today = Store.todayStr();
  const state = { weekStart: Store.startOfWeek(today) };

  function render() {
    const me = Store.me();
    const days = Store.weekDays(state.weekStart);
    const entries = Store.entriesFor(me.id, days[0], days[6]);
    const worked = entries.reduce((s, e) => s + Store.entryHours(e), 0);
    const scheduled = Store.shiftsFor(me.id, days[0], days[6]).reduce((s, x) => s + Store.shiftHours(x), 0);
    const perDay = days.map((d) => entries.filter((e) => e.date === d).reduce((s, e) => s + Store.entryHours(e), 0));
    const max = Math.max(8, ...perDay);
    const ot = Math.max(0, worked - Store.data.company.overtimeAfter);
    const isThisWeek = state.weekStart === Store.startOfWeek(today);
    const weeks = [0, 1, 2, 3].map((i) => { const ws = Store.addDays(Store.startOfWeek(today), -7 * i); return { ws, h: Store.hoursFor(me.id, ws, Store.addDays(ws, 6)) }; });
    const open = Store.openEntry(me.id);

    $('#hours').innerHTML = `
      <div class="hero-card ${open ? 'green' : ''}" data-reveal><div class="between"><span class="label">${isThisWeek ? 'This week' : `Week of ${UI.monthDay(days[0])}`}</span><span class="row gap-4"><button class="icon-btn sm" id="prev" style="color:#fff;background:rgba(255,255,255,.15)" aria-label="Previous week">${icon('chevron-back-outline')}</button><button class="icon-btn sm" id="next" style="color:#fff;background:rgba(255,255,255,.15)" aria-label="Next week">${icon('chevron-forward-outline')}</button></span></div><div class="big">${hours(worked)}<span style="font-size:18px;opacity:.75;font-weight:600"> / ${hours(scheduled, 0)}</span></div><div class="row-meta"><span>${icon('checkmark-circle-outline')}${entries.length} shifts logged</span>${ot ? `<span>${icon('flash-outline')}${hours(ot)} overtime</span>` : `<span>${icon('shield-checkmark-outline')}No overtime</span>`}${open ? `<span class="pill live">On shift · ${hm(Store.entryHours(open))}</span>` : ''}</div></div>
      <div class="card" data-reveal><div class="card-head"><div><div class="card-title">Hours by day</div><div class="card-sub">Tap a bar for details</div></div></div><div class="card-body"><div class="day-bars">${days.map((d, i) => `<div class="day-bar" title="${UI.dateLong(d)}: ${hours(perDay[i])}"><span class="val">${perDay[i] ? hours(perDay[i], perDay[i] % 1 ? 1 : 0) : ''}</span><div class="bar ${d === today ? 'today' : ''}"><span style="height:${(perDay[i] / max) * 100}%;animation-delay:${i * 60}ms"></span></div><label>${UI.dayName(d).slice(0, 1)}</label></div>`).join('')}</div></div></div>
      <div class="section-title" data-reveal><h2>Time entries</h2><span class="text-sm subtle">${hours(worked)} total</span></div>
      <div class="card" data-reveal><div class="list">${entries.length ? entries.slice().reverse().map((e) => { const st = Store.entryState(e); const brk = e.breakStart && e.breakEnd ? Math.round((new Date(e.breakEnd) - new Date(e.breakStart)) / 60000) : 0; return `<div class="entry-row"><div class="date"><b>${Store.parseDate(e.date).getDate()}</b><span>${UI.dayName(e.date)}</span></div><div><div class="t">${time(e.clockIn)} – ${e.clockOut ? time(e.clockOut) : '<span style="color:var(--green-700)">now</span>'}</div><div class="d">${brk ? `${brk} min break` : 'No break'}${st === 'on' || st === 'break' ? ' · <b style="color:var(--green-700)">On shift</b>' : ''}</div></div><div class="h">${hm(Store.entryHours(e))}${e.source === 'kiosk' ? '<small>kiosk</small>' : ''}</div></div>`; }).join('') : `<div class="empty">${icon('time-outline')}<div class="t">No hours logged</div><div>Clock in at the kiosk and your hours appear here.</div></div>`}</div></div>
      <div class="section-title" data-reveal><h2>Recent weeks</h2></div>
      <div class="card" data-reveal><div class="list">${weeks.map((w, i) => `<div class="entry-row" data-ws="${w.ws}" style="cursor:pointer"><div class="grow"><div class="t">${i === 0 ? 'This week' : i === 1 ? 'Last week' : `Week of ${UI.monthDay(w.ws)}`}</div><div class="progress mt-8" style="max-width:180px"><span style="width:${Math.min(100, (w.h / 45) * 100)}%"></span></div></div><div class="h">${hours(w.h)}</div></div>`).join('')}</div></div>`;
    $('#prev').addEventListener('click', () => { state.weekStart = Store.addDays(state.weekStart, -7); render(); });
    $('#next').addEventListener('click', () => { state.weekStart = Store.addDays(state.weekStart, 7); render(); });
    $$('[data-ws]').forEach((r) => r.addEventListener('click', () => { state.weekStart = r.dataset.ws; render(); $('#appBody').scrollTo({ top: 0, behavior: 'smooth' }); }));
    requestAnimationFrame(() => $$('#hours .progress span').forEach((s) => { const w = s.style.width; s.style.width = '0'; requestAnimationFrame(() => (s.style.width = w)); }));
    UI.reveal();
  }
  document.addEventListener('DOMContentLoaded', () => { render(); Store.onChange(() => render()); setInterval(() => { if (Store.openEntry(Store.me().id)) render(); }, 60000); });
})();
