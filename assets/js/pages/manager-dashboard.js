/* Manager · Dashboard */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, money, num, hours, hm, time, relative, positionBadge, statusBadge, leaveType } = UI;

  const today = Store.todayStr();
  const weekStart = Store.startOfWeek(today);
  let hoursDays = 7;

  function kpis() {
    const active = Store.employees({ active: true });
    const onShift = Store.onShiftNow();
    const scheduledToday = Store.shiftsOn(today).length;
    const thisWeek = active.reduce((s, e) => s + Store.hoursFor(e.id, weekStart, today), 0);
    // compare completed days only (through yesterday) so a half-finished today doesn't skew the delta
    const yesterday = Store.addDays(today, -1);
    const soFar = yesterday >= weekStart ? active.reduce((s, e) => s + Store.hoursFor(e.id, weekStart, yesterday), 0) : 0;
    const lastWeekSameSpan = yesterday >= weekStart ? active.reduce((s, e) => s + Store.hoursFor(e.id, Store.addDays(weekStart, -7), Store.addDays(yesterday, -7)), 0) : 0;
    const delta = lastWeekSameSpan ? ((soFar - lastWeekSameSpan) / lastWeekSameSpan) * 100 : 0;
    const pending = Store.timeOff({ status: 'pending' }).length;
    const newThisMonth = Store.employees().filter((e) => Store.diffDays(e.hiredAt, today) <= 30).length;
    const tiles = [
      { icon: 'people-outline', tone: 'blue', label: 'Team members', value: active.length, delta: newThisMonth ? { dir: 'up', text: `+${newThisMonth} new` } : null, foot: 'in the last 30 days' },
      { icon: 'flash-outline', tone: 'green', label: 'On shift now', value: onShift.length, foot: `of ${scheduledToday} scheduled today`, live: true },
      { icon: 'time-outline', tone: 'violet', label: 'Hours this week', value: thisWeek, decimals: 1, suffix: 'h', delta: lastWeekSameSpan ? { dir: delta >= 0 ? 'up' : 'down', text: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` } : null, foot: lastWeekSameSpan ? 'vs same days last week' : 'week just started' },
      { icon: 'airplane-outline', tone: 'amber', label: 'Pending requests', value: pending, foot: pending ? 'waiting for your review' : 'nothing to review', href: 'time-off.html' },
    ];
    const host = $('#kpis'); host.innerHTML = '';
    tiles.forEach((t, i) => {
      const card = el(`<${t.href ? 'a href="' + t.href + '"' : 'div'} class="card card-hover stat" data-reveal="${i * 60}">
        <div class="stat-top"><span class="stat-icon ${t.tone}">${icon(t.icon)}</span>${t.live ? '<span class="badge green live">Live</span>' : ''}</div>
        <div><div class="stat-label">${esc(t.label)}</div><div class="stat-value"><span class="v">0</span>${t.suffix ? `<small>${t.suffix}</small>` : ''}</div></div>
        <div class="stat-foot">${t.delta ? `<span class="delta ${t.delta.dir}">${icon(t.delta.dir === 'up' ? 'arrow-up-outline' : 'arrow-down-outline')}${esc(t.delta.text)}</span>` : ''}<span>${esc(t.foot)}</span></div>
      </${t.href ? 'a' : 'div'}>`);
      host.appendChild(card);
      UI.countUp($('.v', card), t.value, { decimals: t.decimals || 0 });
    });
  }

  function hoursChart() {
    const labels = [], worked = [], scheduled = [];
    for (let i = hoursDays - 1; i >= 0; i--) {
      const d = Store.addDays(today, -i);
      labels.push(hoursDays > 7 ? UI.monthDay(d).replace(' ', ' ') : UI.dayName(d));
      worked.push(Store.entriesOn(d).reduce((s, e) => s + Store.entryHours(e), 0));
      scheduled.push(Store.shiftsOn(d).reduce((s, x) => s + Store.shiftHours(x), 0));
    }
    UI.charts.bars($('#hoursChart'), { labels, series: [{ name: 'Worked', values: worked, color: '#2563EB' }, { name: 'Scheduled', values: scheduled, color: '#BFD3FE' }], height: 240, format: (v) => `${num(v, 1)} h`, yFormat: (v) => `${num(v)}h`, highlight: labels.length - 1, tipLabel: (i) => UI.dateLong(Store.addDays(today, -(hoursDays - 1 - i))) });
  }

  function attendance() {
    const rows = Store.attendanceOn(today);
    const count = (s) => rows.filter((r) => r.status === s).length;
    const on = count('on') + count('break'), done = count('done'), upcoming = count('scheduled'), late = count('late'), missed = count('missed');
    const started = rows.filter((r) => r.status !== 'scheduled').length;
    const present = on + done;
    const rate = started ? Math.round((present / started) * 100) : 100;
    const segments = [
      { label: 'On shift', value: on, color: '#10B981', icon: 'flash-outline' },
      { label: 'Completed', value: done, color: '#2563EB', icon: 'checkmark-circle-outline' },
      { label: 'Not in yet', value: upcoming + late, color: '#CBD5E1', icon: 'hourglass-outline' },
      { label: 'Missed', value: missed, color: '#EF4444', icon: 'close-circle-outline' },
    ].filter((s) => s.value > 0);
    $('#attendanceSub').textContent = `${rows.length} shifts scheduled · ${late ? late + ' running late' : 'nobody late'}`;
    if (!rows.length) { $('#attendanceDonut').innerHTML = `<div class="empty">${icon('calendar-outline')}<div class="t">No shifts today</div></div>`; return; }
    UI.charts.donut($('#attendanceDonut'), { segments, centerValue: `${rate}%`, centerLabel: 'attendance' });
  }

  function onShift() {
    const list = Store.onShiftNow().sort((a, b) => a.entry.clockIn.localeCompare(b.entry.clockIn));
    const host = $('#onShiftList');
    $('#onShiftSub').textContent = list.length ? `${list.length} ${list.length === 1 ? 'person' : 'people'} clocked in` : 'Live from the kiosk';
    if (!list.length) { host.innerHTML = `<div class="empty">${icon('cafe-outline')}<div class="t">No one is clocked in</div><div>Open the <a href="../kiosk/index.html" target="_blank" style="color:var(--primary);font-weight:600">kiosk</a> and clock someone in — it shows up here instantly.</div></div>`; return; }
    host.innerHTML = list.slice(0, 6).map(({ entry, employee }) => {
      const state = Store.entryState(entry);
      return `<div class="list-item">${avatar(employee, 'md', { status: state })}<div class="grow"><div class="t">${esc(employee.name)}</div><div class="d">${esc(Store.position(employee.positionId).name)} · ${esc(Store.location(employee.locationId).name)}</div></div><div class="end"><div class="strong num">${hm(Store.entryHours(entry))}</div><div class="text-sm subtle">${state === 'break' ? 'On break' : 'since ' + time(entry.clockIn)}</div></div></div>`;
    }).join('') + (list.length > 6 ? `<a class="list-item" href="attendance.html" style="justify-content:center;color:var(--primary);font-weight:600;font-size:13px">+${list.length - 6} more on shift</a>` : '');
  }

  function requests() {
    const list = Store.timeOff({ status: 'pending' });
    const host = $('#requestsList');
    if (!list.length) { host.innerHTML = `<div class="empty">${icon('checkmark-done-outline')}<div class="t">All caught up</div><div>No pending requests.</div></div>`; return; }
    host.innerHTML = list.slice(0, 4).map((t) => { const emp = Store.employee(t.employeeId); const lt = leaveType(t.type); return `<div class="list-item" data-id="${t.id}">${avatar(emp, 'md')}<div class="grow"><div class="t">${esc(emp.name)}</div><div class="d">${icon(lt.icon)} ${esc(lt.label)} · ${UI.dateRange(t.from, t.to)} · ${t.days}d</div></div><div class="row gap-4"><button class="icon-btn sm bordered" data-act="declined" title="Decline" style="color:var(--red-600)">${icon('close-outline')}</button><button class="icon-btn sm bordered" data-act="approved" title="Approve" style="color:var(--green-600)">${icon('checkmark-outline')}</button></div></div>`; }).join('');
    host.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { const id = b.closest('[data-id]').dataset.id; const t = Store.setTimeOffStatus(id, b.dataset.act); UI.toast(`${b.dataset.act === 'approved' ? 'Approved' : 'Declined'} ${Store.employee(t.employeeId).first}'s request`, { type: b.dataset.act === 'approved' ? 'success' : 'info' }); }));
  }

  function activity() {
    const items = Store.activity(7);
    const iconFor = { clock: ['time-outline', 'blue'], timeoff: ['airplane-outline', 'amber'], schedule: ['calendar-outline', 'violet'], hire: ['person-add-outline', 'green'], payroll: ['cash-outline', 'green'] };
    $('#activityList').innerHTML = items.length ? items.map((a) => { const [ic, tone] = iconFor[a.type] || ['ellipse-outline', 'gray']; const emp = a.employeeId ? Store.employee(a.employeeId) : null; return `<div class="list-item">${emp ? avatar(emp, 'md') : `<span class="list-icon ${tone}">${icon(ic)}</span>`}<div class="grow"><div class="t" style="font-weight:500">${esc(a.text)}</div><div class="d">${relative(a.at)}</div></div></div>`; }).join('') : `<div class="empty">${icon('pulse-outline')}<div class="t">Nothing yet today</div></div>`;
  }

  function team() {
    const q = ($('#teamSearch').value || '').toLowerCase();
    const rows = Store.employees().filter((e) => !q || e.name.toLowerCase().includes(q) || Store.position(e.positionId).name.toLowerCase().includes(q)).slice(0, q ? 20 : 8);
    const fourWeeks = Store.addDays(today, -27);
    $('#teamTable tbody').innerHTML = rows.map((e) => {
      const h = Store.hoursFor(e.id, weekStart, today);
      const sched = Store.shiftsFor(e.id, weekStart, Store.addDays(weekStart, 6)).reduce((s, x) => s + Store.shiftHours(x), 0);
      const pastShifts = Store.shiftsFor(e.id, fourWeeks, Store.addDays(today, -1));
      const attended = pastShifts.filter((s) => { const en = Store.entryForShift(s.id); return en && en.clockIn; }).length;
      const att = pastShifts.length ? Math.round((attended / pastShifts.length) * 100) : 100;
      const tone = att >= 95 ? 'green' : att >= 85 ? 'amber' : 'red';
      return `<tr class="clickable" data-id="${e.id}"><td><div class="person">${avatar(e, 'md')}<div><div class="name">${esc(e.name)}</div><div class="meta">${esc(e.email)}</div></div></div></td><td class="num">${e.id}</td><td>${positionBadge(Store.position(e.positionId))}</td><td>${esc(Store.location(e.locationId).name)}</td><td>${statusBadge(e.status)}</td><td><div class="row"><div class="progress" style="width:90px"><span style="width:${Math.min(100, (h / Math.max(1, sched)) * 100)}%"></span></div><span class="num text-sm" style="min-width:64px">${hours(h)} <span class="subtle">/ ${hours(sched, 0)}</span></div></td><td><span class="badge ${tone}">${att}%</span></td><td class="right"><button class="icon-btn sm" data-menu aria-label="Actions">${icon('ellipsis-horizontal')}</button></td></tr>`;
    }).join('') || `<tr><td colspan="8"><div class="empty">${icon('search-outline')}<div class="t">No matches</div></div></td></tr>`;
    $$('#teamTable tbody tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', (e) => { if (e.target.closest('[data-menu]')) return; location.href = `employees.html?id=${tr.dataset.id}`; });
      $('[data-menu]', tr).addEventListener('click', (e) => { e.stopPropagation(); const emp = Store.employee(tr.dataset.id); UI.menu(e.currentTarget, [
        { label: 'View profile', icon: 'person-outline', onClick: () => (location.href = `employees.html?id=${emp.id}`) },
        { label: 'View schedule', icon: 'calendar-outline', onClick: () => (location.href = `schedule.html?focus=${emp.id}`) },
        { label: 'Send message', icon: 'chatbubble-outline', onClick: () => (location.href = `messages.html?c=${encodeURIComponent(Store.dmId(Store.data.session.managerId, emp.id))}`) },
      ]); });
    });
    $$('#teamTable .progress span').forEach((s) => { const w = s.style.width; s.style.width = '0'; requestAnimationFrame(() => requestAnimationFrame(() => (s.style.width = w))); });
  }

  function refreshLive() { kpis(); attendance(); onShift(); requests(); activity(); team(); UI.reveal(); }

  document.addEventListener('DOMContentLoaded', () => {
    $('#pageSub').textContent = `${Store.data.company.name} · ${Store.data.locations.map((l) => l.name).join(' & ')} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
    kpis(); hoursChart(); attendance(); onShift(); requests(); activity(); team(); UI.reveal();
    $$('#hoursRange button').forEach((b) => b.addEventListener('click', () => { $$('#hoursRange button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); hoursDays = Number(b.dataset.days); hoursChart(); }));
    $('#teamSearch').addEventListener('input', team);
    $('#btnExport').addEventListener('click', () => UI.toast('Workforce report exported as CSV', { icon: 'download-outline' }));
    Store.onChange(() => refreshLive());
    setInterval(() => { onShift(); }, 30000);
  });
})();
