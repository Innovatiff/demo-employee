/* Manager · Employees */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, money, hours, hm, positionBadge, statusBadge, dateLong, range } = UI;
  const today = Store.todayStr();
  const weekStart = Store.startOfWeek(today);
  const state = { q: UI.qs('q') || '', location: '', position: '', status: '' };

  function kpis() {
    const all = Store.employees();
    const active = all.filter((e) => e.status === 'active').length;
    const leave = all.filter((e) => e.status === 'leave').length;
    const newHires = all.filter((e) => Store.diffDays(e.hiredAt, today) <= 30).length;
    const avgRate = all.reduce((s, e) => s + e.rate, 0) / all.length;
    const tiles = [
      { icon: 'people-outline', tone: 'blue', label: 'Total employees', value: all.length, foot: `${active} active` },
      { icon: 'person-add-outline', tone: 'green', label: 'New this month', value: newHires, foot: 'joined in the last 30 days' },
      { icon: 'airplane-outline', tone: 'amber', label: 'On leave', value: leave, foot: 'currently away' },
      { icon: 'cash-outline', tone: 'violet', label: 'Avg. hourly rate', value: avgRate, format: (v) => money(v), foot: 'across all positions' },
    ];
    $('#kpis').innerHTML = '';
    tiles.forEach((t, i) => { const c = el(`<div class="card card-hover stat" data-reveal="${i * 60}"><div class="stat-top"><span class="stat-icon ${t.tone}">${icon(t.icon)}</span></div><div><div class="stat-label">${esc(t.label)}</div><div class="stat-value"><span class="v">0</span></div></div><div class="stat-foot"><span>${esc(t.foot)}</span></div></div>`); $('#kpis').appendChild(c); UI.countUp($('.v', c), t.value, { format: t.format }); });
  }

  function filters() {
    const chips = [{ id: '', name: 'All locations' }, ...Store.data.locations];
    $('#locChips').innerHTML = chips.map((l) => `<button class="chip ${state.location === l.id ? 'active' : ''}" data-loc="${l.id}">${l.id ? icon('location-outline') : ''}${esc(l.name)}</button>`).join('');
    $$('#locChips .chip').forEach((c) => c.addEventListener('click', () => { state.location = c.dataset.loc; filters(); table(); }));
    const sel = $('#fPosition'); if (sel.options.length === 1) Store.data.positions.forEach((p) => sel.appendChild(el(`<option value="${p.id}">${esc(p.name)}</option>`)));
  }

  function filtered() {
    const q = state.q.toLowerCase();
    return Store.employees().filter((e) => (!q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || Store.position(e.positionId).name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) && (!state.location || e.locationId === state.location) && (!state.position || e.positionId === state.position) && (!state.status || e.status === state.status));
  }

  function table() {
    const rows = filtered();
    $('#countLabel').textContent = `${rows.length} of ${Store.employees().length} employees`;
    $('#pageSub').textContent = `${Store.employees().length} team members across ${Store.data.locations.length} locations`;
    $('#empTable tbody').innerHTML = rows.map((e) => `<tr class="clickable" data-id="${e.id}"><td><div class="person">${avatar(e, 'md')}<div><div class="name">${esc(e.name)}</div><div class="meta">${esc(e.email)}</div></div></div></td><td class="num">${e.id}</td><td>${positionBadge(Store.position(e.positionId))}</td><td>${esc(Store.location(e.locationId).name)}</td><td>${esc(e.type)}</td><td class="right num">${money(e.rate)}<span class="subtle">/h</span></td><td>${dateLong(e.hiredAt, { weekday: false, year: true })}</td><td>${statusBadge(e.status)}</td><td class="right"><button class="icon-btn sm" data-menu aria-label="Actions">${icon('ellipsis-horizontal')}</button></td></tr>`).join('') || `<tr><td colspan="9"><div class="empty">${icon('search-outline')}<div class="t">No employees match</div><div>Try a different search or clear the filters.</div></div></td></tr>`;
    $$('#empTable tbody tr[data-id]').forEach((tr) => {
      tr.addEventListener('click', (e) => { if (e.target.closest('[data-menu]')) return; openProfile(tr.dataset.id); });
      $('[data-menu]', tr).addEventListener('click', (e) => { e.stopPropagation(); rowMenu(e.currentTarget, Store.employee(tr.dataset.id)); });
    });
  }

  function rowMenu(anchor, emp) {
    UI.menu(anchor, [
      { label: 'View profile', icon: 'person-outline', onClick: () => openProfile(emp.id) },
      { label: 'Edit details', icon: 'create-outline', onClick: () => editModal(emp) },
      { label: 'View schedule', icon: 'calendar-outline', onClick: () => (location.href = `schedule.html?focus=${emp.id}`) },
      { label: 'Send message', icon: 'chatbubble-outline', onClick: () => (location.href = `messages.html?c=${encodeURIComponent(Store.dmId(Store.data.session.managerId, emp.id))}`) },
      'divider',
      emp.status === 'inactive' ? { label: 'Reactivate', icon: 'refresh-outline', onClick: () => { Store.updateEmployee(emp.id, { status: 'active' }); UI.toast(`${emp.first} is active again`); } } : { label: 'Deactivate', icon: 'person-remove-outline', danger: true, onClick: async () => { const ok = await UI.confirm({ title: `Deactivate ${emp.name}?`, message: 'They will no longer appear on schedules or be able to clock in. You can reactivate them at any time.', confirmText: 'Deactivate', tone: 'danger', iconName: 'person-remove-outline' }); if (ok) { Store.updateEmployee(emp.id, { status: 'inactive' }); UI.toast(`${emp.first} has been deactivated`, { type: 'info' }); } } },
    ]);
  }

  function openProfile(id) {
    const e = Store.employee(id); if (!e) return;
    const pos = Store.position(e.positionId), loc = Store.location(e.locationId);
    const thisWeek = Store.hoursFor(e.id, weekStart, today);
    const last4 = Store.hoursFor(e.id, Store.addDays(today, -27), today);
    const pastShifts = Store.shiftsFor(e.id, Store.addDays(today, -27), Store.addDays(today, -1));
    const attended = pastShifts.filter((s) => { const en = Store.entryForShift(s.id); return en && en.clockIn; }).length;
    const att = pastShifts.length ? Math.round((attended / pastShifts.length) * 100) : 100;
    const upcoming = Store.shiftsFor(e.id, today, Store.addDays(today, 14)).filter((s) => Store.at(s.date, s.end) > new Date()).slice(0, 4);
    const open = Store.openEntry(e.id);
    const b = e.balances;
    const d = UI.drawer({
      title: e.name, sub: `${pos.name} · ${loc.name}`,
      body: `
        <div class="row" style="gap:16px;margin-bottom:20px">${avatar(e, 'xxl', { status: open ? Store.entryState(open) : null })}<div><div class="row gap-8" style="flex-wrap:wrap">${positionBadge(pos)}${statusBadge(e.status)}${open ? statusBadge(Store.entryState(open)) : ''}</div><div class="muted mt-8" style="font-size:13px">${esc(e.type)} · ${money(e.rate)}/hour · joined ${dateLong(e.hiredAt, { weekday: false, year: true })}</div></div></div>
        <div class="grid grid-3" style="gap:10px;margin-bottom:22px">
          <div class="card" style="padding:14px;box-shadow:none"><div class="text-sm subtle">This week</div><div class="stat-value" style="font-size:22px">${hours(thisWeek)}</div></div>
          <div class="card" style="padding:14px;box-shadow:none"><div class="text-sm subtle">Last 4 weeks</div><div class="stat-value" style="font-size:22px">${hours(last4, 0)}</div></div>
          <div class="card" style="padding:14px;box-shadow:none"><div class="text-sm subtle">Attendance</div><div class="stat-value" style="font-size:22px">${att}%</div></div>
        </div>
        <div class="upper mb-12">Details</div>
        <div class="detail-grid" style="margin-bottom:22px">
          <div class="detail"><span class="k">Employee ID</span><span class="v num">${e.id}</span></div>
          <div class="detail"><span class="k">Kiosk PIN</span><span class="v num">${e.pin}</span></div>
          <div class="detail"><span class="k">Email</span><span class="v truncate">${esc(e.email)}</span></div>
          <div class="detail"><span class="k">Phone</span><span class="v">${esc(e.phone)}</span></div>
          <div class="detail"><span class="k">Location</span><span class="v">${esc(loc.name)}</span></div>
          <div class="detail"><span class="k">Reports to</span><span class="v">${esc(Store.manager().name)}</span></div>
        </div>
        <div class="upper mb-12">Upcoming shifts</div>
        <div class="list card" style="box-shadow:none;margin-bottom:22px">${upcoming.length ? upcoming.map((s) => `<div class="list-item" style="padding:10px 14px"><span class="list-icon" style="background:${pos.color}14;color:${pos.color}">${icon('briefcase-outline')}</span><div class="grow"><div class="t">${UI.dayLabel(s.date)}</div><div class="d">${range(s.start, s.end)} · ${esc(s.label)} · ${esc(Store.location(s.locationId).name)}</div></div><span class="num text-sm muted">${hours(Store.shiftHours(s), 0)}</span></div>`).join('') : `<div class="empty" style="padding:22px">${icon('calendar-outline')}<div class="t">No upcoming shifts</div></div>`}</div>
        <div class="upper mb-12">Time-off balances</div>
        <div class="grid grid-3" style="gap:10px">${['vacation', 'sick', 'personal'].map((k) => `<div class="card" style="padding:12px 14px;box-shadow:none"><div class="text-sm subtle">${UI.leaveType(k).label}</div><div class="strong" style="font-size:16px">${b[k].total - b[k].used}<span class="subtle text-sm"> / ${b[k].total} days</span></div><div class="progress mt-8"><span style="width:${((b[k].total - b[k].used) / b[k].total) * 100}%"></span></div></div>`).join('')}</div>`,
      footer: `<a class="btn btn-secondary" href="messages.html?c=${encodeURIComponent(Store.dmId(Store.data.session.managerId, e.id))}">${icon('chatbubble-outline')}Message</a><button class="btn btn-primary" id="drawerEdit">${icon('create-outline')}Edit details</button>`,
    });
    $('#drawerEdit', d.el).addEventListener('click', () => { d.close(); setTimeout(() => editModal(e), 220); });
    history.replaceState(null, '', `employees.html?id=${e.id}`);
  }

  function formHtml(e = {}) {
    const posOpts = Store.data.positions.map((p) => `<option value="${p.id}" ${e.positionId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    const locOpts = Store.data.locations.map((l) => `<option value="${l.id}" ${e.locationId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
    return `<form class="form-grid" id="empForm">
      <div class="field"><label>First name</label><input class="input" name="first" required value="${esc(e.first || '')}" placeholder="Jamie"></div>
      <div class="field"><label>Last name</label><input class="input" name="last" required value="${esc(e.last || '')}" placeholder="Taylor"></div>
      <div class="field span-2"><label>Email</label><input class="input" name="email" type="email" value="${esc(e.email || '')}" placeholder="jamie@lumen.coffee"></div>
      <div class="field"><label>Phone</label><input class="input" name="phone" value="${esc(e.phone || '')}" placeholder="(415) 555-0100"></div>
      <div class="field"><label>Employment type</label><select class="select" name="type">${['Full-time', 'Part-time', 'Seasonal'].map((t) => `<option ${e.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Position</label><select class="select" name="positionId">${posOpts}</select></div>
      <div class="field"><label>Location</label><select class="select" name="locationId">${locOpts}</select></div>
      <div class="field"><label>Hourly rate ($)</label><input class="input" name="rate" type="number" step="0.5" min="0" value="${e.rate != null ? e.rate : Store.data.positions[0].rate}"></div>
      <div class="field"><label>${e.id ? 'Status' : 'Start date'}</label>${e.id ? `<select class="select" name="status">${[['active', 'Active'], ['leave', 'On leave'], ['inactive', 'Inactive']].map(([v, l]) => `<option value="${v}" ${e.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<input class="input" name="hiredAt" type="date" value="${today}">`}</div>
    </form>`;
  }
  function readForm(form) { const o = {}; new FormData(form).forEach((v, k) => (o[k] = typeof v === 'string' ? v.trim() : v)); return o; }

  function addModal() {
    const m = UI.modal({ title: 'Add employee', sub: 'They will get an invite to the employee app and a kiosk PIN.', body: formHtml(), size: 'lg', footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="saveEmp">${icon('checkmark-outline')}Add employee</button>` });
    const posSel = $('[name=positionId]', m.el), rate = $('[name=rate]', m.el);
    posSel.addEventListener('change', () => (rate.value = Store.position(posSel.value).rate));
    $('#saveEmp', m.el).addEventListener('click', () => {
      const form = $('#empForm', m.el); if (!form.reportValidity()) return;
      const emp = Store.addEmployee(readForm(form));
      m.close(); UI.toast(`${emp.name} added to the team`); kpis(); table(); setTimeout(() => openProfile(emp.id), 250);
    });
  }
  function editModal(e) {
    const m = UI.modal({ title: `Edit ${e.first}'s details`, body: formHtml(e), size: 'lg', footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="saveEmp">${icon('checkmark-outline')}Save changes</button>` });
    $('#saveEmp', m.el).addEventListener('click', () => {
      const form = $('#empForm', m.el); if (!form.reportValidity()) return;
      const p = readForm(form); p.rate = Number(p.rate);
      Store.updateEmployee(e.id, p); m.close(); UI.toast('Changes saved'); kpis(); table();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    kpis(); filters(); $('#q').value = state.q; table(); UI.reveal();
    $('#q').addEventListener('input', () => { state.q = $('#q').value; table(); });
    $('#fPosition').addEventListener('change', (e) => { state.position = e.target.value; table(); });
    $('#fStatus').addEventListener('change', (e) => { state.status = e.target.value; table(); });
    $('#btnAdd').addEventListener('click', addModal);
    $('#btnExport').addEventListener('click', () => UI.toast('Employee list exported as CSV', { icon: 'download-outline' }));
    if (UI.qs('new')) setTimeout(addModal, 300);
    if (UI.qs('id')) setTimeout(() => openProfile(UI.qs('id')), 300);
    Store.onChange(() => { kpis(); table(); });
  });
})();
