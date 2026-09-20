/* Employee · Home */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, hours, hm, time, range, relative } = UI;
  const today = Store.todayStr();
  const weekStart = Store.startOfWeek(today);

  function render() {
    const me = Store.me();
    const open = Store.openEntry(me.id);
    const next = Store.nextShift(me.id);
    const todayShift = Store.shiftsFor(me.id, today, today)[0];
    const worked = Store.hoursFor(me.id, weekStart, Store.addDays(weekStart, 6));
    const scheduled = Store.shiftsFor(me.id, weekStart, Store.addDays(weekStart, 6)).reduce((s, x) => s + Store.shiftHours(x), 0);
    const upcoming = Store.shiftsFor(me.id, today, Store.addDays(today, 14)).filter((s) => Store.at(s.date, s.end) > new Date()).slice(0, 3);
    const ann = Store.messagesIn('announcements').slice(-2).reverse();
    const period = Store.currentPeriod(); const ep = Store.employeePeriod(me.id, period);
    const pending = Store.timeOff({ employeeId: me.id, status: 'pending' }).length;

    let hero;
    if (open) {
      const state = Store.entryState(open);
      hero = `<div class="hero-card green" data-reveal><span class="pill live">${state === 'break' ? 'On break' : 'On shift'}</span><div class="big mt-12" id="liveHours">${hm(Store.entryHours(open))}</div><div class="row-meta"><span>${icon('log-in-outline')}Clocked in ${time(open.clockIn)}</span>${todayShift ? `<span>${icon('time-outline')}Shift ends ${UI.hmLabel(todayShift.end)}</span>` : ''}</div><div class="row-meta" style="margin-top:14px"><span style="opacity:.85">${icon('information-circle-outline')}Punch out at the kiosk when your shift ends</span></div></div>`;
    } else if (next) {
      const start = Store.at(next.date, next.start); const mins = Math.round((start - new Date()) / 60000);
      const inText = mins <= 0 ? 'Starting now' : mins < 60 ? `Starts in ${mins} min` : mins < 60 * 24 ? `Starts in ${Math.floor(mins / 60)}h ${mins % 60}m` : `${UI.dayLabel(next.date)}`;
      hero = `<div class="hero-card" data-reveal><span class="label">Next shift</span><div class="big">${range(next.start, next.end)}</div><div class="row-meta"><span>${icon('calendar-outline')}${UI.dayLabel(next.date)}</span><span>${icon('location-outline')}${esc(Store.location(next.locationId).name)}</span><span>${icon('briefcase-outline')}${esc(next.label)}</span></div><div class="between" style="margin-top:16px"><span class="pill">${icon('hourglass-outline')}${inText}</span><a class="btn btn-sm" href="schedule.html">View schedule</a></div></div>`;
    } else {
      hero = `<div class="hero-card dark" data-reveal><span class="label">No upcoming shifts</span><div class="big">Enjoy your time off ☕</div><div class="row-meta"><span>${icon('calendar-outline')}Nothing scheduled in the next 3 weeks</span></div></div>`;
    }

    $('#home').innerHTML = `
      <div data-reveal class="greeting"><div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div><h2 style="font-size:25px;margin-top:4px">${UI.greeting()}, ${esc(me.first)} 👋</h2></div>
      ${hero}
      <div class="quick" data-reveal>
        <a href="time-off.html"><span class="list-icon amber">${icon('airplane-outline')}</span>Time off</a>
        <a href="pay.html"><span class="list-icon green">${icon('cash-outline')}</span>Pay</a>
        <a href="hours.html"><span class="list-icon blue">${icon('time-outline')}</span>Hours</a>
        <a href="messages.html"><span class="list-icon violet">${icon('chatbubbles-outline')}</span>Chat</a>
      </div>
      <div class="card" data-reveal><div class="card-body" style="display:flex;align-items:center;gap:16px"><div id="weekRing"></div><div class="grow"><div class="strong" style="font-size:15px">This week</div><div class="text-sm muted mt-4">${hours(worked)} worked of ${hours(scheduled, 0)} scheduled</div><div class="row gap-8 mt-12" style="flex-wrap:wrap"><span class="badge blue no-dot">${icon('cash-outline')}${UI.money(ep.gross, { cents: false })} this period</span>${ep.overtime ? `<span class="badge amber no-dot">${icon('flash-outline')}${hours(ep.overtime)} OT</span>` : ''}${pending ? `<span class="badge amber no-dot">${icon('hourglass-outline')}${pending} request pending</span>` : ''}</div></div></div></div>
      <div class="section-title" data-reveal><h2>Upcoming shifts</h2><a href="schedule.html">All shifts ${icon('chevron-forward-outline')}</a></div>
      <div class="card" data-reveal><div class="list">${upcoming.length ? upcoming.map((s) => { const p = Store.position(s.positionId); return `<div class="shift-card" style="border-bottom:1px solid var(--border)"><div class="time" style="background:${p.color}14;color:${p.color}">${UI.hmLabel(s.start).replace(' ', '<small>')}</small></div><div class="grow"><div class="t">${UI.dayLabel(s.date)}</div><div class="d">${range(s.start, s.end)} · ${hours(Store.shiftHours(s), 0)}</div><div class="tags"><span class="tag">${icon('location-outline')}${esc(Store.location(s.locationId).name)}</span><span class="tag">${esc(s.label)}</span></div></div></div>`; }).join('') : `<div class="empty">${icon('calendar-outline')}<div class="t">No upcoming shifts</div></div>`}</div></div>
      <div class="section-title" data-reveal><h2>Announcements</h2><a href="messages.html?c=announcements">Open ${icon('chevron-forward-outline')}</a></div>
      ${ann.map((m) => { const from = Store.employee(m.fromId); return `<div class="card" data-reveal><div class="card-body"><div class="row gap-10">${avatar(from, 'sm')}<div><div class="strong text-sm">${esc(from.name)}</div><div class="text-xs subtle">${relative(m.at)} · #announcements</div></div></div><p class="mt-12" style="font-size:13.5px;line-height:1.55;color:var(--text-2)">${esc(m.text)}</p></div></div>`; }).join('')}`;
    $$('#home .shift-card:last-child').forEach((n) => (n.style.borderBottom = '0'));
    UI.charts.ring($('#weekRing'), { value: worked, max: scheduled || 1, size: 92, stroke: 9, label: `${Math.round((worked / (scheduled || 1)) * 100)}%`, sub: 'of week' });
    UI.reveal();
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    Store.onChange(() => render());
    setInterval(() => { const me = Store.me(); const open = Store.openEntry(me.id); const n = $('#liveHours'); if (open && n) n.textContent = hm(Store.entryHours(open)); }, 30000);
  });
})();
