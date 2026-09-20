/* Employee · Schedule */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, hours, range, monthDay } = UI;
  const today = Store.todayStr();
  const state = { weekStart: Store.startOfWeek(today), day: today };

  function render() {
    const me = Store.me();
    const days = Store.weekDays(state.weekStart);
    const weekShifts = Store.shiftsFor(me.id, days[0], days[6]);
    const total = weekShifts.reduce((s, x) => s + Store.shiftHours(x), 0);
    const leave = Store.timeOff({ employeeId: me.id, status: 'approved' });
    const dayShifts = weekShifts.filter((s) => s.date === state.day);
    const off = leave.find((t) => state.day >= t.from && state.day <= t.to);
    const isThisWeek = state.weekStart === Store.startOfWeek(today);
    const coworkers = Store.shiftsOn(state.day).filter((s) => s.employeeId !== me.id && dayShifts.some((m) => m.locationId === s.locationId)).map((s) => Store.employee(s.employeeId)).filter(Boolean);

    $('#schedule').innerHTML = `
      <div class="card" data-reveal><div class="card-body" style="padding:12px 12px 12px">
        <div class="between mb-12" style="padding:0 4px"><button class="icon-btn sm" id="prev" aria-label="Previous week">${icon('chevron-back-outline')}</button><div style="text-align:center"><div class="strong" style="font-size:14px">${monthDay(days[0])} – ${monthDay(days[6])}</div><div class="text-xs subtle">${isThisWeek ? 'This week' : state.weekStart > today ? 'Next weeks' : 'Past week'} · ${hours(total, 0)} scheduled</div></div><button class="icon-btn sm" id="next" aria-label="Next week">${icon('chevron-forward-outline')}</button></div>
        <div class="week-days">${days.map((d) => `<button class="week-day ${d === state.day ? 'active' : ''} ${d === today ? 'today' : ''} ${weekShifts.some((s) => s.date === d) ? 'has' : ''}" data-day="${d}"><span>${UI.dayName(d).slice(0, 3)}</span><b>${Store.parseDate(d).getDate()}</b><i></i></button>`).join('')}</div>
      </div></div>
      <div class="section-title" data-reveal><h2>${UI.dayLabel(state.day)}</h2>${!isThisWeek ? `<a href="#" id="backToday">This week ${icon('chevron-forward-outline')}</a>` : ''}</div>
      ${dayShifts.length ? dayShifts.map((s) => { const p = Store.position(s.positionId); const loc = Store.location(s.locationId); const e = Store.entryForShift(s.id); return `<div class="card" data-reveal><div class="shift-card"><div class="time" style="background:${p.color}14;color:${p.color}">${UI.hmLabel(s.start).replace(' ', '<small>')}</small></div><div class="grow"><div class="t">${esc(s.label)} shift</div><div class="d">${range(s.start, s.end)} · ${hours(Store.shiftHours(s), 0)}</div><div class="tags"><span class="tag">${icon('location-outline')}${esc(loc.name)}</span><span class="tag">${icon('briefcase-outline')}${esc(p.name)}</span>${!s.published ? '<span class="tag" style="color:var(--amber-700);background:var(--amber-50)">Draft</span>' : ''}${e && e.clockIn ? `<span class="tag" style="color:var(--green-700);background:var(--green-50)">${icon('checkmark-circle-outline')}${e.clockOut ? hours(Store.entryHours(e)) + ' logged' : 'On shift'}</span>` : ''}</div></div></div></div>`; }).join('') : `<div class="card" data-reveal><div class="empty">${icon(off ? 'airplane-outline' : 'cafe-outline')}<div class="t">${off ? UI.leaveType(off.type).label + ' · approved' : 'Day off'}</div><div>${off ? 'Enjoy your time off!' : 'Nothing scheduled on this day.'}</div></div></div>`}
      ${coworkers.length ? `<div class="card" data-reveal><div class="card-body"><div class="between"><div><div class="strong text-sm">Working with you</div><div class="text-xs subtle">${coworkers.length} teammates on the same day</div></div><div class="avatar-stack">${coworkers.slice(0, 5).map((e) => UI.avatar(e, 'sm')).join('')}${coworkers.length > 5 ? `<span class="avatar sm more">+${coworkers.length - 5}</span>` : ''}</div></div></div></div>` : ''}
      <div class="section-title" data-reveal><h2>Whole week</h2><span class="text-sm subtle">${weekShifts.length} shifts</span></div>
      <div class="card" data-reveal><div class="list">${weekShifts.length ? weekShifts.map((s) => `<div class="entry-row" data-day="${s.date}" style="cursor:pointer"><div class="date"><b>${Store.parseDate(s.date).getDate()}</b><span>${UI.dayName(s.date)}</span></div><div><div class="t">${range(s.start, s.end)}</div><div class="d">${esc(s.label)} · ${esc(Store.location(s.locationId).name)}</div></div><div class="h">${hours(Store.shiftHours(s), 0)}</div></div>`).join('') : `<div class="empty">${icon('calendar-outline')}<div class="t">No shifts this week</div></div>`}</div></div>`;
    $$('.week-day').forEach((b) => b.addEventListener('click', () => { state.day = b.dataset.day; render(); }));
    $$('.entry-row[data-day]').forEach((r) => r.addEventListener('click', () => { state.day = r.dataset.day; render(); $('#appBody').scrollTo({ top: 0, behavior: 'smooth' }); }));
    $('#prev').addEventListener('click', () => { state.weekStart = Store.addDays(state.weekStart, -7); state.day = state.weekStart; render(); });
    $('#next').addEventListener('click', () => { state.weekStart = Store.addDays(state.weekStart, 7); state.day = state.weekStart; render(); });
    const bt = $('#backToday'); bt && bt.addEventListener('click', (e) => { e.preventDefault(); state.weekStart = Store.startOfWeek(today); state.day = today; render(); });
    UI.reveal();
  }
  document.addEventListener('DOMContentLoaded', () => { render(); Store.onChange(() => render()); });
})();
