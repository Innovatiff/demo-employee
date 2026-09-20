/* Employee · Profile & settings */
(function () {
  'use strict';
  const { $, $$, icon, esc, avatar, money, dateLong } = UI;

  function render() {
    const me = Store.me(); const pos = Store.position(me.positionId); const loc = Store.location(me.locationId);
    const prefs = Store.data.settings.employeeApp;
    const tenure = Math.floor(Store.diffDays(me.hiredAt, Store.todayStr()) / 30);
    const item = (ic, tone, t, val, key) => `<div class="list-item" data-item="${key}"><span class="list-icon ${tone}">${icon(ic)}</span><div class="grow"><div class="t">${t}</div></div>${val ? `<span class="val">${val}</span>` : ''}${icon('chevron-forward-outline', 'chev')}</div>`;
    $('#me').innerHTML = `
      <div class="profile-head" data-reveal>${avatar(me, 'xxl', { solid: true })}<h2>${esc(me.name)}</h2><div class="sub">${esc(pos.name)} · ${esc(loc.name)}</div><div class="row gap-6 mt-12" style="justify-content:center">${UI.positionBadge(pos)}<span class="badge gray no-dot">${me.id}</span><span class="badge green">${esc(me.type)}</span></div></div>
      <div class="grid grid-3" style="gap:10px" data-reveal><div class="card stat-mini"><span class="l">Hourly rate</span><span class="v">${money(me.rate)}</span></div><div class="card stat-mini"><span class="l">Tenure</span><span class="v">${tenure >= 12 ? `${(tenure / 12).toFixed(1).replace(/\.0$/, '')}<small> yrs</small>` : `${tenure}<small> mo</small>`}</span></div><div class="card stat-mini"><span class="l">Vacation left</span><span class="v">${me.balances.vacation.total - me.balances.vacation.used}<small> days</small></span></div></div>
      <div class="section-title" data-reveal><h2>Work</h2></div>
      <div class="card menu-list" data-reveal><div class="list">${item('briefcase-outline', 'blue', 'Position & pay', esc(pos.name), 'position')}<a class="list-item" href="pay.html"><span class="list-icon green">${icon('cash-outline')}</span><div class="grow"><div class="t">My pay</div></div>${icon('chevron-forward-outline', 'chev')}</a><a class="list-item" href="time-off.html"><span class="list-icon amber">${icon('airplane-outline')}</span><div class="grow"><div class="t">Time off</div></div><span class="val">${Store.timeOff({ employeeId: me.id, status: 'pending' }).length ? 'Pending' : ''}</span>${icon('chevron-forward-outline', 'chev')}</a><a class="list-item" href="hours.html"><span class="list-icon violet">${icon('time-outline')}</span><div class="grow"><div class="t">Hours & timesheets</div></div>${icon('chevron-forward-outline', 'chev')}</a></div></div>
      <div class="section-title" data-reveal><h2>Account</h2></div>
      <div class="card menu-list" data-reveal><div class="list">${item('person-outline', 'blue', 'Personal details', '', 'personal')}${item('key-outline', 'gray', 'Kiosk PIN', '••••', 'pin')}${item('shield-checkmark-outline', 'green', 'Availability', 'Mon – Sat', 'availability')}</div></div>
      <div class="section-title" data-reveal><h2>Notifications</h2></div>
      <div class="card" data-reveal><div class="card-body" style="padding-top:2px;padding-bottom:2px">
        <div class="switch-row"><div><div class="t">Shift reminders</div><div class="d">1 hour before your shift starts</div></div><span class="switch ${prefs.shiftReminders ? 'on' : ''}" data-pref="shiftReminders"></span></div>
        <div class="switch-row"><div><div class="t">Chat messages</div><div class="d">Direct messages and channel activity</div></div><span class="switch ${prefs.chat ? 'on' : ''}" data-pref="chat"></span></div>
        <div class="switch-row"><div><div class="t">Pay day</div><div class="d">When your pay stub is ready</div></div><span class="switch ${prefs.payday ? 'on' : ''}" data-pref="payday"></span></div>
        <div class="switch-row"><div><div class="t">Weekly summary</div><div class="d">Hours and earnings every Monday</div></div><span class="switch ${prefs.weeklySummary ? 'on' : ''}" data-pref="weeklySummary"></span></div>
      </div></div>
      <div class="card menu-list" data-reveal><div class="list">${item('help-circle-outline', 'gray', 'Help & support', '', 'help')}<a class="list-item" href="../index.html"><span class="list-icon red">${icon('log-out-outline')}</span><div class="grow"><div class="t" style="color:var(--red-700)">Sign out</div></div></a></div></div>
      <div class="text-xs subtle" style="text-align:center;padding:6px 0 10px" data-reveal>Crewline · Demo build · ${esc(Store.data.company.name)}</div>`;
    UI.bindSwitches($('#me'));
    $$('#me .switch').forEach((s) => s.addEventListener('toggle', (e) => { Store.data.settings.employeeApp[s.dataset.pref] = e.detail.on; Store.save(); UI.toast(e.detail.on ? 'Notifications on' : 'Notifications off', { type: 'info', duration: 1500 }); }));
    $$('#me [data-item]').forEach((n) => n.addEventListener('click', () => sheets[n.dataset.item] && sheets[n.dataset.item]()));
    UI.reveal();
  }

  const sheets = {
    position() {
      const me = Store.me(); const pos = Store.position(me.positionId);
      EmpShell.sheet({ title: 'Position & pay', sub: 'Managed by your manager', body: `<div class="detail-grid"><div class="detail"><span class="k">Position</span><span class="v">${esc(pos.name)}</span></div><div class="detail"><span class="k">Employment</span><span class="v">${esc(me.type)}</span></div><div class="detail"><span class="k">Hourly rate</span><span class="v">${money(me.rate)}</span></div><div class="detail"><span class="k">Overtime</span><span class="v">1.5× after ${Store.data.company.overtimeAfter}h</span></div><div class="detail"><span class="k">Location</span><span class="v">${esc(Store.location(me.locationId).name)}</span></div><div class="detail"><span class="k">Reports to</span><span class="v">${esc(Store.manager().name)}</span></div><div class="detail"><span class="k">Start date</span><span class="v">${dateLong(me.hiredAt, { weekday: false, year: true })}</span></div><div class="detail"><span class="k">Employee ID</span><span class="v">${me.id}</span></div></div><div class="demo-note mt-16">${icon('information-circle-outline')}Want a change? Message ${esc(Store.manager().first)} directly.</div>`, footer: `<a class="btn btn-secondary btn-lg btn-block" href="messages.html?c=${encodeURIComponent(Store.dmId(me.id, Store.data.session.managerId))}">${icon('chatbubble-outline')}Message ${esc(Store.manager().first)}</a>` });
    },
    personal() {
      const me = Store.me();
      const s = EmpShell.sheet({ title: 'Personal details', body: `<form id="pf" class="col gap-12"><div class="form-grid"><div class="field"><label>First name</label><input class="input" name="first" value="${esc(me.first)}" required></div><div class="field"><label>Last name</label><input class="input" name="last" value="${esc(me.last)}" required></div></div><div class="field"><label>Email</label><input class="input" type="email" name="email" value="${esc(me.email)}"></div><div class="field"><label>Phone</label><input class="input" name="phone" value="${esc(me.phone)}"></div></form>`, footer: `<button class="btn btn-primary btn-lg btn-block" id="savePf">${icon('checkmark-outline')}Save changes</button>` });
      $('#savePf', s.el).addEventListener('click', () => { const f = $('#pf', s.el); if (!f.reportValidity()) return; Store.updateEmployee(me.id, { first: f.first.value.trim(), last: f.last.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() }); s.close(); UI.toast('Details saved'); render(); });
    },
    pin() {
      const me = Store.me();
      const s = EmpShell.sheet({ title: 'Kiosk PIN', sub: 'Used to clock in and out on the store iPad', body: `<div class="center" style="gap:10px;padding:10px 0 18px">${me.pin.split('').map((d) => `<span class="card" style="width:52px;height:60px;display:grid;place-items:center;font:700 24px var(--font-display);box-shadow:none">${d}</span>`).join('')}</div><div class="field"><label>New PIN (${Store.data.settings.kiosk.pinLength} digits)</label><input class="input" id="newPin" inputmode="numeric" maxlength="${Store.data.settings.kiosk.pinLength}" placeholder="••••"></div>`, footer: `<button class="btn btn-primary btn-lg btn-block" id="savePin">${icon('key-outline')}Update PIN</button>` });
      $('#savePin', s.el).addEventListener('click', () => { const v = $('#newPin', s.el).value.trim(); if (!new RegExp(`^\\d{${Store.data.settings.kiosk.pinLength}}$`).test(v)) { UI.toast(`PIN must be ${Store.data.settings.kiosk.pinLength} digits`, { type: 'error' }); return; } Store.updateEmployee(me.id, { pin: v }); s.close(); UI.toast('PIN updated — use it at the kiosk'); });
    },
    availability() {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; const me = Store.me();
      const s = EmpShell.sheet({ title: 'Availability', sub: 'Days you can be scheduled', body: `<div class="row gap-6" style="flex-wrap:wrap;justify-content:center" id="days">${days.map((d, i) => `<button type="button" class="chip ${me.pattern.includes(i) ? 'active' : ''}" data-i="${i}">${d}</button>`).join('')}</div>`, footer: `<button class="btn btn-primary btn-lg btn-block" id="saveAv">${icon('checkmark-outline')}Save availability</button>` });
      $$('#days .chip', s.el).forEach((c) => c.addEventListener('click', () => c.classList.toggle('active')));
      $('#saveAv', s.el).addEventListener('click', () => { const pattern = $$('#days .chip.active', s.el).map((c) => Number(c.dataset.i)); Store.updateEmployee(me.id, { pattern }); s.close(); UI.toast('Availability saved — your manager has been notified'); render(); });
    },
    help() { EmpShell.sheet({ title: 'Help & support', body: `<div class="list">${[['book-outline', 'Getting started guide'], ['chatbubble-ellipses-outline', 'Contact support'], ['document-text-outline', 'Company handbook']].map(([ic, t]) => `<div class="list-item" style="padding:12px 4px;cursor:pointer"><span class="list-icon gray">${icon(ic)}</span><div class="grow"><div class="t">${t}</div></div>${icon('open-outline', 'chev')}</div>`).join('')}</div>` }); },
  };

  document.addEventListener('DOMContentLoaded', () => { render(); Store.onChange((src) => { if (src === 'remote') render(); }); });
})();
