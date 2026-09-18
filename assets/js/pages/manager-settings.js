/* Manager · Settings */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, money, avatar } = UI;
  const state = { panel: UI.qs('panel') || 'company' };

  const sw = (key, on) => `<span class="switch ${on ? 'on' : ''}" data-key="${key}"></span>`;

  function panels() {
    const d = Store.data; const c = d.company; const k = d.settings.kiosk; const n = d.settings.notifications;
    let size = 0; try { size = (localStorage.getItem(Store.KEY) || '').length; } catch (e) { }
    $('#panels').innerHTML = `
      <section class="settings-panel ${state.panel === 'company' ? 'active' : ''}" data-panel="company">
        <div class="card"><div class="card-head bordered"><div><div class="card-title">Company profile</div><div class="card-sub">Shown across the manager console, employee app and kiosk</div></div></div>
        <div class="card-body"><form class="form-grid" id="companyForm">
          <div class="field"><label>Company name</label><input class="input" name="name" value="${esc(c.name)}"></div>
          <div class="field"><label>Short name</label><input class="input" name="shortName" value="${esc(c.shortName)}"></div>
          <div class="field"><label>Industry</label><select class="select" name="industry">${['Hospitality', 'Retail', 'Healthcare', 'Logistics', 'Manufacturing', 'Services'].map((x) => `<option ${c.industry === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label>Week starts on</label><select class="select" name="weekStart">${['Monday', 'Sunday'].map((x) => `<option ${c.weekStart === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label>Pay frequency</label><select class="select" name="payFrequency">${['Weekly', 'Bi-weekly', 'Semi-monthly', 'Monthly'].map((x) => `<option ${c.payFrequency === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label>Overtime after (hours/week)</label><input class="input" type="number" name="overtimeAfter" value="${c.overtimeAfter}" min="0"></div>
        </form></div>
        <div class="card-foot"><span>Changes apply instantly across all apps</span><button class="btn btn-primary" id="saveCompany">${icon('checkmark-outline')}Save changes</button></div></div>
      </section>

      <section class="settings-panel ${state.panel === 'locations' ? 'active' : ''}" data-panel="locations">
        <div class="card"><div class="card-head bordered"><div><div class="card-title">Locations</div><div class="card-sub">Each location has its own schedule, crew channel and kiosk</div></div><button class="btn btn-secondary btn-sm" id="addLoc">${icon('add-outline')}Add location</button></div>
        <div class="card-body flush">${d.locations.map((l) => { const staff = Store.employees({ active: true, locationId: l.id }).length; return `<div class="loc-card" data-id="${l.id}"><span class="list-icon blue">${icon('storefront-outline')}</span><div class="grow"><div class="strong">${esc(l.name)}</div><div class="text-sm subtle">${esc(l.address)} · Open ${UI.hmLabel(l.opens)} – ${UI.hmLabel(l.closes)}</div></div><span class="badge gray no-dot">${staff} staff</span><button class="icon-btn sm" data-edit aria-label="Edit">${icon('create-outline')}</button></div>`; }).join('')}</div></div>
      </section>

      <section class="settings-panel ${state.panel === 'positions' ? 'active' : ''}" data-panel="positions">
        <div class="card"><div class="card-head bordered"><div><div class="card-title">Positions &amp; default pay</div><div class="card-sub">Default hourly rates for new hires — colors are used on the schedule</div></div><button class="btn btn-secondary btn-sm" id="addPos">${icon('add-outline')}Add position</button></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Position</th><th>Color</th><th class="right">Default rate</th><th class="right">Headcount</th><th class="right">Avg. actual rate</th><th></th></tr></thead><tbody>${d.positions.map((p) => { const emps = Store.employees({ active: true, positionId: p.id }); const avg = emps.length ? emps.reduce((s, e) => s + e.rate, 0) / emps.length : p.rate; return `<tr data-id="${p.id}"><td class="primary">${esc(p.name)}</td><td><span class="swatch" style="background:${p.color}"></span></td><td class="right num">${money(p.rate)}/h</td><td class="right num">${emps.length}</td><td class="right num">${money(avg)}/h</td><td class="right"><button class="icon-btn sm" data-editpos aria-label="Edit">${icon('create-outline')}</button></td></tr>`; }).join('')}</tbody></table></div></div>
      </section>

      <section class="settings-panel ${state.panel === 'kiosk' ? 'active' : ''}" data-panel="kiosk">
        <div class="card"><div class="card-head bordered"><div><div class="card-title">Clock-in kiosk</div><div class="card-sub">Rules for the iPad kiosk at each location</div></div><a class="btn btn-secondary btn-sm" href="../kiosk/index.html" target="_blank" rel="noopener">${icon('open-outline')}Open kiosk</a></div>
        <div class="card-body" style="padding-top:4px">
          <div class="switch-row"><div><div class="t">Require photo on clock-in</div><div class="d">Take a quick selfie to prevent buddy punching</div></div>${sw('kiosk.requirePhoto', k.requirePhoto)}</div>
          <div class="switch-row"><div><div class="t">Auto clock-out</div><div class="d">Close forgotten shifts 1 hour after the scheduled end</div></div>${sw('kiosk.autoClockOut', k.autoClockOut)}</div>
          <div class="switch-row"><div><div class="t">Location lock</div><div class="d">Only allow clock-ins from the store's Wi-Fi</div></div>${sw('kiosk.geofence', k.geofence)}</div>
          <div class="form-grid mt-20"><div class="field"><label>PIN length</label><select class="select" id="pinLength">${[4, 5, 6].map((x) => `<option ${k.pinLength === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label>Default break (minutes)</label><input class="input" id="breakMinutes" type="number" value="${k.breakMinutes}" min="0" step="5"></div></div>
        </div>
        <div class="card-foot"><span>Employees' PINs are in their profiles</span><button class="btn btn-primary" id="saveKiosk">${icon('checkmark-outline')}Save changes</button></div></div>
      </section>

      <section class="settings-panel ${state.panel === 'notifications' ? 'active' : ''}" data-panel="notifications">
        <div class="card"><div class="card-head bordered"><div><div class="card-title">Manager notifications</div><div class="card-sub">What you want to be alerted about</div></div></div>
        <div class="card-body" style="padding-top:4px">
          <div class="switch-row"><div><div class="t">Late arrivals &amp; missed shifts</div><div class="d">Alert when someone is 8+ minutes late or doesn't clock in</div></div>${sw('notifications.shiftReminders', n.shiftReminders)}</div>
          <div class="switch-row"><div><div class="t">Time-off requests</div><div class="d">New requests and reminders for pending ones</div></div>${sw('notifications.timeOffUpdates', n.timeOffUpdates)}</div>
          <div class="switch-row"><div><div class="t">Messages</div><div class="d">Direct messages and mentions in channels</div></div>${sw('notifications.chat', n.chat)}</div>
          <div class="switch-row"><div><div class="t">Weekly summary</div><div class="d">Hours, labor cost and attendance every Monday morning</div></div>${sw('notifications.weeklySummary', n.weeklySummary)}</div>
        </div></div>
      </section>

      <section class="settings-panel ${state.panel === 'demo' ? 'active' : ''}" data-panel="demo">
        <div class="card"><div class="card-head bordered"><div><div class="card-title">Demo data</div><div class="card-sub">Everything in this demo runs in your browser — no server, no sign-up</div></div></div>
        <div class="card-body">
          <div class="grid grid-3" style="gap:12px;margin-bottom:20px">
            <div class="card" style="padding:14px;box-shadow:none"><div class="text-sm subtle">Employees</div><div class="stat-value" style="font-size:22px">${d.employees.length}</div></div>
            <div class="card" style="padding:14px;box-shadow:none"><div class="text-sm subtle">Shifts &amp; time entries</div><div class="stat-value" style="font-size:22px">${d.shifts.length} · ${d.timeEntries.length}</div></div>
            <div class="card" style="padding:14px;box-shadow:none"><div class="text-sm subtle">Stored locally</div><div class="stat-value" style="font-size:22px">${(size / 1024).toFixed(0)} KB</div></div>
          </div>
          <p class="muted" style="font-size:13.5px;line-height:1.6">Sample data is generated fresh each day relative to today, so schedules, timesheets and payroll always look current. The three apps share the same data: clock someone in on the <a href="../kiosk/index.html" target="_blank" style="color:var(--primary);font-weight:600">kiosk</a>, approve a request here, or send a message from the <a href="../employee/index.html" target="_blank" style="color:var(--primary);font-weight:600">employee app</a> — every screen updates live.</p>
          <div class="demo-note mt-16">${icon('information-circle-outline')}Signed in as ${esc(Store.manager().name)} (manager). The employee app is signed in as ${esc(Store.me().name)}.</div>
        </div>
        <div class="card-foot"><span>Resetting restores the original sample data</span><button class="btn btn-danger-soft" id="resetDemo">${icon('refresh-outline')}Reset demo data</button></div></div>
      </section>`;

    UI.bindSwitches($('#panels'));
    $$('#panels .switch').forEach((s) => s.addEventListener('toggle', (e) => { const [group, key] = s.dataset.key.split('.'); Store.data.settings[group][key] = e.detail.on; Store.save(); UI.toast(`${e.detail.on ? 'Enabled' : 'Disabled'}`, { type: 'info', duration: 1600 }); }));
    $('#saveCompany').addEventListener('click', () => { const f = $('#companyForm'); Object.assign(Store.data.company, { name: f.name.value.trim() || c.name, shortName: f.shortName.value.trim() || c.shortName, industry: f.industry.value, weekStart: f.weekStart.value, payFrequency: f.payFrequency.value, overtimeAfter: Number(f.overtimeAfter.value) || 40 }); Store.save(); UI.toast('Company profile saved'); });
    $('#saveKiosk').addEventListener('click', () => { Store.data.settings.kiosk.pinLength = Number($('#pinLength').value); Store.data.settings.kiosk.breakMinutes = Number($('#breakMinutes').value) || 30; Store.save(); UI.toast('Kiosk settings saved'); });
    $('#resetDemo').addEventListener('click', Shell.resetDemo);
    $('#addLoc').addEventListener('click', () => locModal());
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => locModal(Store.location(b.closest('[data-id]').dataset.id))));
    $('#addPos').addEventListener('click', () => posModal());
    $$('[data-editpos]').forEach((b) => b.addEventListener('click', () => posModal(Store.position(b.closest('[data-id]').dataset.id))));
  }

  function locModal(l) {
    const m = UI.modal({ title: l ? `Edit ${l.name}` : 'Add location', body: `<form class="form-grid" id="locForm"><div class="field span-2"><label>Name</label><input class="input" name="name" required value="${esc(l ? l.name : '')}" placeholder="Airport"></div><div class="field span-2"><label>Address</label><input class="input" name="address" value="${esc(l ? l.address : '')}" placeholder="Street address"></div><div class="field"><label>Opens</label><input class="input" type="time" name="opens" value="${l ? l.opens : '07:00'}"></div><div class="field"><label>Closes</label><input class="input" type="time" name="closes" value="${l ? l.closes : '21:00'}"></div></form>`, footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="saveLoc">${icon('checkmark-outline')}Save</button>` });
    $('#saveLoc', m.el).addEventListener('click', () => { const f = $('#locForm', m.el); if (!f.reportValidity()) return; const p = { name: f.name.value.trim(), address: f.address.value.trim(), opens: f.opens.value, closes: f.closes.value }; if (l) Object.assign(l, p); else Store.data.locations.push({ id: `L${Store.data.locations.length + 1}`, ...p }); Store.save(); m.close(); UI.toast(l ? 'Location updated' : 'Location added'); panels(); });
  }
  function posModal(p) {
    const colors = ['#2563EB', '#EA580C', '#059669', '#7C3AED', '#DB2777'];
    const m = UI.modal({ title: p ? `Edit ${p.name}` : 'Add position', body: `<form class="form-grid" id="posForm"><div class="field"><label>Name</label><input class="input" name="name" required value="${esc(p ? p.name : '')}" placeholder="Supervisor"></div><div class="field"><label>Default rate ($/h)</label><input class="input" type="number" step="0.5" name="rate" value="${p ? p.rate : 20}"></div><div class="field span-2"><label>Schedule color</label><div class="row gap-8" id="colors">${colors.map((c) => `<button type="button" class="swatch" data-c="${c}" style="background:${c};width:28px;height:28px;border-radius:8px;outline:${(p ? p.color : colors[0]) === c ? '3px solid var(--text)' : 'none'};outline-offset:2px"></button>`).join('')}</div></div></form>`, footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="savePos">${icon('checkmark-outline')}Save</button>` });
    let color = p ? p.color : colors[0];
    $$('#colors .swatch', m.el).forEach((b) => b.addEventListener('click', () => { color = b.dataset.c; $$('#colors .swatch', m.el).forEach((x) => (x.style.outline = 'none')); b.style.outline = '3px solid var(--text)'; }));
    $('#savePos', m.el).addEventListener('click', () => { const f = $('#posForm', m.el); if (!f.reportValidity()) return; const patch = { name: f.name.value.trim(), rate: Number(f.rate.value) || 0, color }; if (p) Object.assign(p, patch); else Store.data.positions.push({ id: patch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...patch }); Store.save(); m.close(); UI.toast(p ? 'Position updated' : 'Position added'); panels(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    panels(); UI.reveal();
    $$('#settingsNav button').forEach((b) => b.addEventListener('click', () => { state.panel = b.dataset.panel; $$('#settingsNav button').forEach((x) => x.classList.toggle('active', x === b)); $$('.settings-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === state.panel)); history.replaceState(null, '', `settings.html?panel=${state.panel}`); }));
    const active = $(`#settingsNav [data-panel="${state.panel}"]`); if (active) { $$('#settingsNav button').forEach((x) => x.classList.toggle('active', x === active)); }
  });
})();
