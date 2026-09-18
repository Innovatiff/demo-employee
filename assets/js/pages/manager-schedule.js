/* Manager · Schedule */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, money, hours, hmLabel, range, monthDay, dayName, positionBadge } = UI;
  const today = Store.todayStr();
  const state = { weekStart: Store.startOfWeek(today), location: '', focus: UI.qs('focus') || '' };

  const days = () => Store.weekDays(state.weekStart);
  const weekShifts = () => Store.shiftsBetween(state.weekStart, Store.addDays(state.weekStart, 6)).filter((s) => !state.location || s.locationId === state.location);

  function kpis() {
    const shifts = weekShifts();
    const totalHours = shifts.reduce((s, x) => s + Store.shiftHours(x), 0);
    const people = new Set(shifts.map((s) => s.employeeId)).size;
    const cost = shifts.reduce((s, x) => { const e = Store.employee(x.employeeId); return s + Store.shiftHours(x) * (e ? e.rate : 0); }, 0);
    const drafts = shifts.filter((s) => !s.published).length;
    const tiles = [
      { icon: 'time-outline', tone: 'blue', label: 'Scheduled hours', value: totalHours, format: (v) => `${UI.num(v, 0)}h`, foot: `${shifts.length} shifts this week` },
      { icon: 'people-outline', tone: 'violet', label: 'People scheduled', value: people, foot: `of ${Store.employees({ active: true }).length} active employees` },
      { icon: 'cash-outline', tone: 'green', label: 'Estimated labor cost', value: cost, format: (v) => money(v, { cents: false }), foot: 'based on hourly rates' },
      { icon: 'paper-plane-outline', tone: drafts ? 'amber' : 'gray', label: 'Unpublished shifts', value: drafts, foot: drafts ? 'publish to notify the team' : 'everything is published' },
    ];
    $('#kpis').innerHTML = '';
    tiles.forEach((t, i) => { const c = el(`<div class="card card-hover stat" data-reveal="${i * 60}"><div class="stat-top"><span class="stat-icon ${t.tone}">${icon(t.icon)}</span></div><div><div class="stat-label">${esc(t.label)}</div><div class="stat-value"><span class="v">0</span></div></div><div class="stat-foot"><span>${esc(t.foot)}</span></div></div>`); $('#kpis').appendChild(c); UI.countUp($('.v', c), t.value, { format: t.format }); c.classList.add('is-in'); });
    const drafts2 = drafts; $('#btnPublish').innerHTML = `${icon('paper-plane-outline')}Publish${drafts2 ? ` <span class="badge no-dot" style="background:rgba(255,255,255,.22);color:#fff;height:20px;padding:0 7px">${drafts2}</span>` : ''}`;
  }

  function header() {
    const d = days();
    $('#weekLabel').textContent = `${monthDay(d[0])} – ${monthDay(d[6])}`;
    const isThis = state.weekStart === Store.startOfWeek(today);
    $('#pageSub').textContent = isThis ? 'This week' : state.weekStart > today ? 'Upcoming week' : 'Past week';
    $('#btnToday').disabled = isThis;
    const chips = [{ id: '', name: 'All locations' }, ...Store.data.locations];
    $('#locChips').innerHTML = chips.map((l) => `<button class="chip ${state.location === l.id ? 'active' : ''}" data-loc="${l.id}">${l.id ? icon('location-outline') : ''}${esc(l.name)}</button>`).join('');
    $$('#locChips .chip').forEach((c) => c.addEventListener('click', () => { state.location = c.dataset.loc; render(); }));
    $('#legend').innerHTML = Store.data.positions.map((p) => `<span><i style="background:${p.color}"></i>${esc(p.name)}</span>`).join('');
  }

  function grid() {
    const d = days();
    const emps = Store.employees({ active: true }).filter((e) => !state.location || e.locationId === state.location);
    const host = $('#sched');
    const leave = Store.timeOff({ status: 'approved' });
    let html = `<div class="sched-h first">Employee</div>` + d.map((x) => `<div class="sched-h ${x === today ? 'today' : ''}">${dayName(x)}<b>${Store.parseDate(x).getDate()}</b></div>`).join('') + `<div class="sched-h">Hours</div>`;
    emps.forEach((e) => {
      const pos = Store.position(e.positionId);
      let total = 0;
      html += `<div class="sched-row ${state.focus === e.id ? 'focus' : ''}" data-emp="${e.id}"><div class="sched-emp">${avatar(e, 'md')}<div class="grow" style="min-width:0"><div class="strong truncate" style="font-size:13.5px">${esc(e.name)}</div><div class="text-sm subtle truncate">${esc(pos.name)} · ${esc(Store.location(e.locationId).name)}</div></div></div>`;
      d.forEach((date) => {
        const shifts = Store.shiftsOn(date).filter((s) => s.employeeId === e.id);
        const off = leave.find((t) => t.employeeId === e.id && date >= t.from && date <= t.to);
        shifts.forEach((s) => (total += Store.shiftHours(s)));
        html += `<div class="sched-cell ${date === today ? 'today' : ''}" data-date="${date}" data-emp="${e.id}">${off && !shifts.length ? `<div class="shift off"><b>${icon('airplane-outline')} Time off</b><span>${esc(UI.leaveType(off.type).label)}</span></div>` : ''}${shifts.map((s) => { const p = Store.position(s.positionId); return `<div class="shift ${s.published ? '' : 'draft'}" style="--c:${p.color}" data-shift="${s.id}" tabindex="0"><b>${range(s.start, s.end)}</b><span>${esc(s.label)} · ${esc(Store.location(s.locationId).name)}</span></div>`; }).join('')}${!shifts.length && !off ? `<button class="add" data-add aria-label="Add shift">${icon('add-outline')}</button>` : ''}</div>`;
      });
      html += `<div class="sched-total">${total ? hours(total, 0) : '<span class="subtle">—</span>'}</div></div>`;
    });
    host.innerHTML = html;
    $$('[data-shift]', host).forEach((n) => { n.addEventListener('click', () => shiftModal(Store.shift(n.dataset.shift))); n.addEventListener('keydown', (e) => { if (e.key === 'Enter') shiftModal(Store.shift(n.dataset.shift)); }); });
    $$('[data-add]', host).forEach((b) => b.addEventListener('click', () => { const cell = b.closest('.sched-cell'); shiftModal(null, { employeeId: cell.dataset.emp, date: cell.dataset.date }); }));
    const total = weekShifts().reduce((s, x) => s + Store.shiftHours(x), 0);
    $('#footNote').textContent = `${emps.length} employees · ${UI.num(total, 0)} scheduled hours · last published ${UI.dateLong(Store.data.settings.schedulePublished)}`;
    if (state.focus) { const row = $(`.sched-row[data-emp="${state.focus}"] .sched-emp`, host); row && row.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  function shiftModal(shift, defaults = {}) {
    const isEdit = !!shift;
    const s = shift || { employeeId: defaults.employeeId || Store.employees({ active: true })[0].id, date: defaults.date || today, start: '09:30', end: '17:30', label: 'Mid', positionId: null, locationId: null };
    const emp = Store.employee(s.employeeId);
    const templates = [['Opening', '06:00', '14:00'], ['Mid', '09:30', '17:30'], ['Closing', '14:00', '22:00'], ['Kitchen AM', '07:00', '15:00'], ['Kitchen PM', '11:00', '19:00'], ['Manager', '08:00', '17:00']];
    const m = UI.modal({
      title: isEdit ? 'Edit shift' : 'Add shift', sub: isEdit ? `${emp.name} · ${UI.dateLong(s.date)}` : 'Pick a template or set custom times',
      body: `<form class="form-grid" id="shiftForm">
        <div class="field span-2"><label>Employee</label><select class="select" name="employeeId">${Store.employees({ active: true }).map((e) => `<option value="${e.id}" ${e.id === s.employeeId ? 'selected' : ''}>${esc(e.name)} — ${esc(Store.position(e.positionId).name)}</option>`).join('')}</select></div>
        <div class="field span-2"><label>Template</label><div class="row gap-6" style="flex-wrap:wrap" id="tpl">${templates.map(([l, a, b]) => `<button type="button" class="chip ${s.label === l ? 'active' : ''}" data-l="${l}" data-a="${a}" data-b="${b}">${l}</button>`).join('')}</div></div>
        <div class="field"><label>Date</label><input class="input" type="date" name="date" value="${s.date}" required></div>
        <div class="field"><label>Location</label><select class="select" name="locationId">${Store.data.locations.map((l) => `<option value="${l.id}" ${(s.locationId || emp.locationId) === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Start</label><input class="input" type="time" name="start" value="${s.start}" required></div>
        <div class="field"><label>End</label><input class="input" type="time" name="end" value="${s.end}" required></div>
        <div class="field span-2"><label>Label</label><input class="input" name="label" value="${esc(s.label)}" placeholder="e.g. Opening"></div>
      </form>`,
      footer: `${isEdit ? `<button class="btn btn-danger-soft" id="delShift" style="margin-right:auto">${icon('trash-outline')}Delete</button>` : ''}<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="saveShift">${icon('checkmark-outline')}${isEdit ? 'Save changes' : 'Add shift'}</button>`,
    });
    const form = $('#shiftForm', m.el);
    $$('#tpl .chip', m.el).forEach((c) => c.addEventListener('click', () => { $$('#tpl .chip', m.el).forEach((x) => x.classList.remove('active')); c.classList.add('active'); form.start.value = c.dataset.a; form.end.value = c.dataset.b; form.label.value = c.dataset.l; }));
    $('#saveShift', m.el).addEventListener('click', () => {
      if (!form.reportValidity()) return;
      const e = Store.employee(form.employeeId.value);
      const payload = { employeeId: e.id, positionId: e.positionId, locationId: form.locationId.value, date: form.date.value, start: form.start.value, end: form.end.value, label: form.label.value.trim() || 'Shift' };
      if (isEdit) { Store.updateShift(shift.id, payload); UI.toast('Shift updated'); } else { Store.addShift(payload); UI.toast(`Shift added for ${e.first} · publish to notify them`, { icon: 'calendar-outline' }); }
      m.close(); render();
    });
    if (isEdit) $('#delShift', m.el).addEventListener('click', async () => { m.close(); const ok = await UI.confirm({ title: 'Delete this shift?', message: `${emp.name} will be removed from ${UI.dateLong(s.date)}. They'll be notified if the schedule was already published.`, confirmText: 'Delete shift', tone: 'danger', iconName: 'trash-outline' }); if (ok) { Store.deleteShift(shift.id); UI.toast('Shift deleted', { type: 'info' }); render(); } });
  }

  function render() { header(); kpis(); grid(); }

  document.addEventListener('DOMContentLoaded', () => {
    render(); UI.reveal();
    $('#prevWeek').addEventListener('click', () => { state.weekStart = Store.addDays(state.weekStart, -7); render(); });
    $('#nextWeek').addEventListener('click', () => { state.weekStart = Store.addDays(state.weekStart, 7); render(); });
    $('#btnToday').addEventListener('click', () => { state.weekStart = Store.startOfWeek(today); render(); });
    $('#btnAdd').addEventListener('click', () => shiftModal(null, { date: state.weekStart >= Store.startOfWeek(today) ? (state.weekStart === Store.startOfWeek(today) ? today : state.weekStart) : state.weekStart }));
    $('#btnPublish').addEventListener('click', async () => {
      const drafts = weekShifts().filter((s) => !s.published).length;
      const people = new Set(weekShifts().map((s) => s.employeeId)).size;
      const ok = await UI.confirm({ title: 'Publish this week\'s schedule?', message: `${people} employees will be notified in the app${drafts ? ` and ${drafts} draft shift${drafts > 1 ? 's' : ''} will go live` : ''}.`, confirmText: 'Publish schedule', iconName: 'paper-plane-outline' });
      if (!ok) return;
      Store.publishSchedule(state.weekStart); UI.toast(`Schedule published · ${people} employees notified`); render();
    });
    Store.onChange((src) => { if (src === 'remote') render(); });
  });
})();
