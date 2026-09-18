/* Manager · Time & Attendance */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, hours, hm, time, range, statusBadge } = UI;
  const today = Store.todayStr();
  const state = { date: UI.qs('date') || today, location: '', status: '' };

  function rows() { return Store.attendanceOn(state.date).filter((r) => (!state.location || r.shift.locationId === state.location) && (!state.status || r.status === state.status)); }

  function kpis() {
    const all = Store.attendanceOn(state.date);
    const on = all.filter((r) => r.status === 'on' || r.status === 'break').length;
    const late = all.filter((r) => r.lateMin > 0 || r.status === 'late').length;
    const missed = all.filter((r) => r.status === 'missed').length;
    const logged = all.reduce((s, r) => s + r.hours, 0);
    const sched = all.reduce((s, r) => s + Store.shiftHours(r.shift), 0);
    const tiles = [
      { icon: 'flash-outline', tone: 'green', label: 'On shift now', value: on, foot: `${all.length} scheduled ${state.date === today ? 'today' : 'that day'}`, live: state.date === today },
      { icon: 'time-outline', tone: 'blue', label: 'Hours logged', value: logged, format: (v) => `${UI.num(v, 1)}h`, foot: `of ${UI.num(sched, 0)}h scheduled` },
      { icon: 'alert-circle-outline', tone: 'amber', label: 'Late arrivals', value: late, foot: late ? 'more than 8 min after start' : 'everyone on time' },
      { icon: 'close-circle-outline', tone: missed ? 'red' : 'gray', label: 'Missed shifts', value: missed, foot: missed ? 'no clock-in recorded' : 'no missed shifts' },
    ];
    $('#kpis').innerHTML = '';
    tiles.forEach((t, i) => { const c = el(`<div class="card card-hover stat is-in" data-reveal="${i * 60}"><div class="stat-top"><span class="stat-icon ${t.tone}">${icon(t.icon)}</span>${t.live ? '<span class="badge green live">Live</span>' : ''}</div><div><div class="stat-label">${esc(t.label)}</div><div class="stat-value"><span class="v">0</span></div></div><div class="stat-foot"><span>${esc(t.foot)}</span></div></div>`); $('#kpis').appendChild(c); UI.countUp($('.v', c), t.value, { format: t.format }); });
  }

  function header() {
    $('#dayLabel').textContent = UI.dayLabel(state.date);
    $('#btnToday').disabled = state.date === today;
    $('#pageSub').textContent = state.date === today ? 'Live clock-ins from the kiosk' : `Timesheet for ${UI.dateLong(state.date, { year: true })}`;
    const chips = [{ id: '', name: 'All locations' }, ...Store.data.locations];
    $('#locChips').innerHTML = chips.map((l) => `<button class="chip ${state.location === l.id ? 'active' : ''}" data-loc="${l.id}">${l.id ? icon('location-outline') : ''}${esc(l.name)}</button>`).join('');
    $$('#locChips .chip').forEach((c) => c.addEventListener('click', () => { state.location = c.dataset.loc; render(); }));
  }

  function table() {
    const list = rows().sort((a, b) => a.shift.start.localeCompare(b.shift.start) || a.employee.name.localeCompare(b.employee.name));
    const order = { on: 0, break: 0, late: 1, scheduled: 2, done: 3, missed: 4 };
    list.sort((a, b) => order[a.status] - order[b.status] || a.shift.start.localeCompare(b.shift.start));
    $('#attTable tbody').innerHTML = list.map((r) => {
      const e = r.entry; const pos = Store.position(r.employee.positionId);
      const brk = e && e.breakStart ? (e.breakEnd ? hm((new Date(e.breakEnd) - new Date(e.breakStart)) / 3600000) : `<span class="badge amber">On break</span>`) : '<span class="subtle">—</span>';
      const inCell = r.firstIn ? `<span class="num">${time(r.firstIn)}</span>${r.lateMin ? `<span class="late-tag">${icon('time-outline')}+${r.lateMin}m</span>` : ''}` : (r.status === 'missed' ? '<span class="subtle">No clock-in</span>' : '<span class="subtle">—</span>');
      const outCell = r.status === 'on' || r.status === 'break' ? `<span class="live-cell"><i></i>In progress</span>` : r.lastOut ? `<span class="num">${time(r.lastOut)}</span>` : '<span class="subtle">—</span>';
      return `<tr data-id="${r.shift.id}"><td><div class="person">${avatar(r.employee, 'md', { status: r.status === 'on' ? 'on' : r.status === 'break' ? 'break' : null })}<div><div class="name">${esc(r.employee.name)}</div><div class="meta">${esc(pos.name)} · ${esc(Store.location(r.employee.locationId).name)}</div></div></div></td><td><div class="strong num">${range(r.shift.start, r.shift.end)}</div><div class="text-sm subtle">${esc(r.shift.label)} · ${esc(Store.location(r.shift.locationId).name)}</div></td><td>${inCell}</td><td>${brk}</td><td>${outCell}</td><td class="right num strong">${r.hours ? hm(r.hours) : '<span class="subtle">—</span>'}</td><td>${statusBadge(r.status)}</td><td class="right"><button class="icon-btn sm" data-menu aria-label="Actions">${icon('ellipsis-horizontal')}</button></td></tr>`;
    }).join('') || `<tr><td colspan="8"><div class="empty">${icon('calendar-outline')}<div class="t">No shifts ${state.status ? 'with that status' : 'scheduled'}</div></div></td></tr>`;
    $$('#attTable [data-menu]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); const r = list.find((x) => x.shift.id === b.closest('tr').dataset.id); rowMenu(b, r); }));
    const total = list.reduce((s, r) => s + r.hours, 0);
    $('#footNote').textContent = `${list.length} shifts · ${UI.num(total, 1)} hours logged`;
  }

  function rowMenu(anchor, r) {
    const items = [];
    if (r.status === 'on' || r.status === 'break') items.push({ label: 'Clock out now', icon: 'log-out-outline', onClick: () => { Store.clockOut(r.employee.id); UI.toast(`${r.employee.first} clocked out`, { type: 'info' }); } });
    if (r.status === 'scheduled' || r.status === 'late') items.push({ label: 'Clock in now', icon: 'log-in-outline', onClick: () => { Store.clockIn(r.employee.id); UI.toast(`${r.employee.first} clocked in`); } });
    if (r.entry && r.entry.clockIn) items.push({ label: 'Adjust times', icon: 'create-outline', onClick: () => adjustModal(r) });
    items.push({ label: 'View profile', icon: 'person-outline', onClick: () => (location.href = `employees.html?id=${r.employee.id}`) });
    items.push({ label: 'Message', icon: 'chatbubble-outline', onClick: () => (location.href = `messages.html?c=${encodeURIComponent(Store.dmId(Store.data.session.managerId, r.employee.id))}`) });
    UI.menu(anchor, items);
  }

  function adjustModal(r) {
    const e = r.entry;
    const toLocal = (iso) => iso ? Store.toHM(new Date(iso)) : '';
    const m = UI.modal({ title: 'Adjust time entry', sub: `${r.employee.name} · ${UI.dateLong(r.shift.date)}`, body: `<form class="form-grid" id="adjForm"><div class="field"><label>Clock in</label><input class="input" type="time" name="in" value="${toLocal(e.clockIn)}" required></div><div class="field"><label>Clock out</label><input class="input" type="time" name="out" value="${toLocal(e.clockOut)}"></div><div class="field"><label>Break start</label><input class="input" type="time" name="bs" value="${toLocal(e.breakStart)}"></div><div class="field"><label>Break end</label><input class="input" type="time" name="be" value="${toLocal(e.breakEnd)}"></div><div class="field span-2"><label>Reason</label><input class="input" name="reason" placeholder="e.g. Forgot to clock out"></div></form>`, footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="saveAdj">${icon('checkmark-outline')}Save</button>` });
    $('#saveAdj', m.el).addEventListener('click', () => {
      const f = $('#adjForm', m.el); if (!f.reportValidity()) return;
      const set = (hmv) => hmv ? Store.at(r.shift.date, hmv).toISOString() : null;
      e.clockIn = set(f.in.value); e.clockOut = set(f.out.value); e.breakStart = set(f.bs.value); e.breakEnd = set(f.be.value);
      Store.save(); m.close(); UI.toast('Time entry updated'); render();
    });
  }

  function render() { header(); kpis(); table(); }

  document.addEventListener('DOMContentLoaded', () => {
    render(); UI.reveal();
    $('#prevDay').addEventListener('click', () => { state.date = Store.addDays(state.date, -1); render(); });
    $('#nextDay').addEventListener('click', () => { state.date = Store.addDays(state.date, 1); render(); });
    $('#btnToday').addEventListener('click', () => { state.date = today; render(); });
    $('#fStatus').addEventListener('change', (e) => { state.status = e.target.value; table(); });
    $('#btnExport').addEventListener('click', () => UI.toast('Timesheet exported as CSV', { icon: 'download-outline' }));
    Store.onChange(() => render());
    setInterval(() => { if (state.date === today) { kpis(); table(); } }, 30000);
  });
})();
