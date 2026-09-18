/* Manager · Time off */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, relative, statusBadge, leaveType, dateRange } = UI;
  const today = Store.todayStr();
  const state = { tab: UI.qs('tab') || 'pending' };

  function kpis() {
    const all = Store.timeOff();
    const pending = all.filter((t) => t.status === 'pending').length;
    const approved = all.filter((t) => t.status === 'approved');
    const awayToday = approved.filter((t) => t.from <= today && t.to >= today).length;
    const upcoming = approved.filter((t) => t.from > today && t.from <= Store.addDays(today, 30)).length;
    const daysMonth = approved.filter((t) => t.from <= Store.addDays(today, 30) && t.to >= today).reduce((s, t) => s + t.days, 0);
    const tiles = [
      { icon: 'hourglass-outline', tone: 'amber', label: 'Pending review', value: pending, foot: pending ? 'waiting on you' : 'all reviewed' },
      { icon: 'airplane-outline', tone: 'blue', label: 'Away today', value: awayToday, foot: 'approved leave' },
      { icon: 'calendar-outline', tone: 'violet', label: 'Upcoming (30 days)', value: upcoming, foot: 'approved requests' },
      { icon: 'sunny-outline', tone: 'green', label: 'Days off this month', value: daysMonth, foot: 'across the team' },
    ];
    $('#kpis').innerHTML = '';
    tiles.forEach((t, i) => { const c = el(`<div class="card card-hover stat is-in"><div class="stat-top"><span class="stat-icon ${t.tone}">${icon(t.icon)}</span></div><div><div class="stat-label">${esc(t.label)}</div><div class="stat-value"><span class="v">0</span></div></div><div class="stat-foot"><span>${esc(t.foot)}</span></div></div>`); $('#kpis').appendChild(c); UI.countUp($('.v', c), t.value); });
  }

  function tabs() {
    const counts = { pending: Store.timeOff({ status: 'pending' }).length, approved: Store.timeOff({ status: 'approved' }).length, declined: Store.timeOff({ status: 'declined' }).length, all: Store.timeOff().length };
    $('#tabs').innerHTML = [['pending', 'Pending'], ['approved', 'Approved'], ['declined', 'Declined'], ['all', 'All']].map(([k, l]) => `<button class="${state.tab === k ? 'active' : ''}" data-tab="${k}">${l}<span class="count">${counts[k]}</span></button>`).join('');
    $$('#tabs button').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; tabs(); table(); }));
  }

  function table() {
    const list = Store.timeOff(state.tab === 'all' ? {} : { status: state.tab });
    $('#reqList').innerHTML = list.map((t) => { const e = Store.employee(t.employeeId); const lt = leaveType(t.type); return `<div class="req-row clickable" data-id="${t.id}">${avatar(e, 'md')}<div class="grow" style="min-width:0"><div class="row gap-8" style="flex-wrap:wrap"><span class="strong" style="font-size:14px">${esc(e.name)}</span><span class="badge ${lt.tone} no-dot">${icon(lt.icon)}${esc(lt.label)}</span></div><div class="text-sm muted mt-4"><b class="num" style="color:var(--text)">${dateRange(t.from, t.to)}</b> · ${t.days} day${t.days > 1 ? 's' : ''} · ${esc(Store.position(e.positionId).name)} · requested ${relative(t.createdAt)}</div>${t.note ? `<div class="req-note truncate mt-4">“${esc(t.note)}”</div>` : ''}</div><div class="req-end">${statusBadge(t.status)}<div class="row gap-6">${t.status === 'pending' ? `<button class="btn btn-sm btn-danger-soft" data-act="declined">Decline</button><button class="btn btn-sm btn-success-soft" data-act="approved">Approve</button>` : `<button class="btn btn-sm btn-ghost" data-act="pending">Undo</button>`}</div></div></div>`; }).join('') || `<div class="empty">${icon('checkmark-done-outline')}<div class="t">No ${state.tab === 'all' ? '' : state.tab} requests</div><div>${state.tab === 'pending' ? 'You\'re all caught up.' : ''}</div></div>`;
    $$('#reqList [data-id]').forEach((row) => {
      row.addEventListener('click', (ev) => { if (ev.target.closest('[data-act]')) return; detail(row.dataset.id); });
      $$('[data-act]', row).forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); decide(row.dataset.id, b.dataset.act); }));
    });
  }

  function decide(id, status) {
    const t = Store.setTimeOffStatus(id, status);
    const e = Store.employee(t.employeeId);
    UI.toast(status === 'approved' ? `Approved ${e.first}'s ${leaveType(t.type).label.toLowerCase()} · they've been notified` : status === 'declined' ? `Declined ${e.first}'s request` : 'Request moved back to pending', { type: status === 'approved' ? 'success' : 'info' });
    kpis(); tabs(); table(); away();
  }

  function detail(id) {
    const t = Store.timeOff().find((x) => x.id === id); const e = Store.employee(t.employeeId); const lt = leaveType(t.type);
    const b = e.balances[t.type] || null;
    const overlap = Store.timeOff({ status: 'approved' }).filter((o) => o.id !== t.id && o.from <= t.to && o.to >= t.from);
    const m = UI.modal({
      title: `${lt.label} request`, sub: `${e.name} · requested ${relative(t.createdAt)}`,
      body: `<div class="row" style="gap:14px;margin-bottom:18px">${avatar(e, 'lg')}<div><div class="strong" style="font-size:15px">${esc(e.name)}</div><div class="muted text-sm">${esc(Store.position(e.positionId).name)} · ${esc(Store.location(e.locationId).name)}</div></div><span style="margin-left:auto">${statusBadge(t.status)}</span></div>
        <div class="detail-grid" style="margin-bottom:18px"><div class="detail"><span class="k">Dates</span><span class="v">${dateRange(t.from, t.to)}</span></div><div class="detail"><span class="k">Duration</span><span class="v">${t.days} day${t.days > 1 ? 's' : ''}</span></div><div class="detail"><span class="k">Type</span><span class="v">${esc(lt.label)}</span></div><div class="detail"><span class="k">Balance after</span><span class="v">${b ? `${b.total - b.used - (t.status === 'approved' ? 0 : t.days)} of ${b.total} days` : '—'}</span></div></div>
        ${t.note ? `<div class="upper mb-8">Note</div><div class="card" style="padding:12px 14px;box-shadow:none;font-size:13.5px;line-height:1.55;color:var(--text-2)">${esc(t.note)}</div>` : ''}
        ${overlap.length ? `<div class="demo-note mt-16">${icon('alert-circle-outline')}Overlaps with ${overlap.map((o) => Store.employee(o.employeeId).first).join(', ')} — check coverage before approving.</div>` : `<div class="row mt-16 text-sm" style="color:var(--green-600);font-weight:600">${icon('checkmark-circle-outline')}No overlapping leave — coverage looks fine.</div>`}`,
      footer: t.status === 'pending' ? `<button class="btn btn-danger-soft" data-act="declined">${icon('close-outline')}Decline</button><button class="btn btn-success" data-act="approved">${icon('checkmark-outline')}Approve</button>` : `<button class="btn btn-secondary" data-close>Close</button><button class="btn btn-ghost" data-act="pending">Move to pending</button>`,
    });
    $$('[data-act]', m.el).forEach((b) => b.addEventListener('click', () => { decide(t.id, b.dataset.act); m.close(); }));
  }

  function away() {
    const end = Store.addDays(today, 14);
    const items = Store.timeOff({ status: 'approved' }).filter((t) => t.to >= today && t.from <= end).sort((a, b) => a.from.localeCompare(b.from));
    $('#awayList').innerHTML = items.length ? items.map((t) => { const e = Store.employee(t.employeeId); const lt = leaveType(t.type); const d = Store.parseDate(t.from < today ? today : t.from); return `<div class="away-day"><div class="date"><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-US', { month: 'short' })}</span></div><div class="grow"><div class="row gap-8">${avatar(e, 'sm')}<div><div class="strong" style="font-size:13.5px">${esc(e.name)}</div><div class="text-sm subtle">${icon(lt.icon)} ${esc(lt.label)} · ${dateRange(t.from, t.to)}${t.from <= today ? ' · <b style="color:var(--amber-600)">away now</b>' : ''}</div></div></div></div></div>`; }).join('') : `<div class="empty">${icon('sunny-outline')}<div class="t">Nobody is away</div><div>Full team for the next two weeks.</div></div>`;
  }

  function addModal() {
    const m = UI.modal({ title: 'Add time off', sub: 'Log leave on behalf of an employee — it will be approved immediately.', body: `<form class="form-grid" id="toForm"><div class="field span-2"><label>Employee</label><select class="select" name="employeeId">${Store.employees({ active: true }).map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div><div class="field span-2"><label>Type</label><div class="row gap-6" style="flex-wrap:wrap">${Object.entries(UI.leaveTypes).map(([k, v], i) => `<button type="button" class="chip ${i === 0 ? 'active' : ''}" data-type="${k}">${icon(v.icon)}${v.label}</button>`).join('')}</div></div><div class="field"><label>From</label><input class="input" type="date" name="from" value="${today}" required></div><div class="field"><label>To</label><input class="input" type="date" name="to" value="${today}" required></div><div class="field span-2"><label>Note</label><input class="input" name="note" placeholder="Optional"></div></form>`, footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="saveTo">${icon('checkmark-outline')}Add time off</button>` });
    let type = 'vacation';
    $$('[data-type]', m.el).forEach((c) => c.addEventListener('click', () => { $$('[data-type]', m.el).forEach((x) => x.classList.remove('active')); c.classList.add('active'); type = c.dataset.type; }));
    $('#saveTo', m.el).addEventListener('click', () => { const f = $('#toForm', m.el); if (!f.reportValidity()) return; if (f.to.value < f.from.value) { UI.toast('End date must be after the start date', { type: 'error' }); return; } const t = Store.addTimeOff({ employeeId: f.employeeId.value, type, from: f.from.value, to: f.to.value, note: f.note.value.trim() }); Store.setTimeOffStatus(t.id, 'approved'); m.close(); UI.toast('Time off added and approved'); state.tab = 'approved'; kpis(); tabs(); table(); away(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    kpis(); tabs(); table(); away(); UI.reveal();
    $('#btnAdd').addEventListener('click', addModal);
    $('#btnExport').addEventListener('click', () => UI.toast('Time-off report exported', { icon: 'download-outline' }));
    Store.onChange((src) => { if (src === 'remote') { kpis(); tabs(); table(); away(); } });
  });
})();
