/* Employee · Time off */
(function () {
  'use strict';
  const { $, $$, icon, esc, relative, statusBadge, leaveType, dateRange } = UI;
  const today = Store.todayStr();

  function render() {
    const me = Store.me();
    const b = me.balances;
    const list = Store.timeOff({ employeeId: me.id });
    const pendingDays = list.filter((t) => t.status === 'pending').reduce((s, t) => s + t.days, 0);
    $('#timeoff').innerHTML = `
      <div class="balances" data-reveal>${[['vacation', '#2563EB'], ['sick', '#DC2626'], ['personal', '#D97706']].map(([k, c]) => `<div class="balance"><div id="ring-${k}"></div><div class="l">${leaveType(k).label}</div></div>`).join('')}</div>
      <button class="btn btn-primary btn-lg btn-block" id="btnReq" data-reveal>${icon('add-outline')}Request time off</button>
      ${pendingDays ? `<div class="demo-note" data-reveal>${icon('hourglass-outline')}${pendingDays} day${pendingDays > 1 ? 's' : ''} pending approval from ${esc(Store.manager().first)}</div>` : ''}
      <div class="section-title" data-reveal><h2>My requests</h2><span class="text-sm subtle">${list.length} total</span></div>
      ${list.length ? list.map((t) => { const lt = leaveType(t.type); return `<div class="card req-card" data-reveal><div class="top"><span class="list-icon ${lt.tone}">${icon(lt.icon)}</span><div class="grow"><div class="strong" style="font-size:14px">${esc(lt.label)} · ${t.days} day${t.days > 1 ? 's' : ''}</div><div class="text-sm subtle">${dateRange(t.from, t.to)} · ${relative(t.createdAt)}</div></div>${statusBadge(t.status)}</div>${t.note ? `<div class="note">${esc(t.note)}</div>` : ''}${t.status === 'pending' ? `<div class="row mt-12" style="justify-content:flex-end"><button class="btn btn-sm btn-ghost" data-cancel="${t.id}">${icon('close-outline')}Cancel request</button></div>` : t.decidedBy ? `<div class="text-xs subtle mt-8">${t.status === 'approved' ? 'Approved' : 'Declined'} by ${esc(Store.employee(t.decidedBy).name)}</div>` : ''}</div>`; }).join('') : `<div class="card" data-reveal><div class="empty">${icon('sunny-outline')}<div class="t">No requests yet</div><div>Plan a break — your manager gets notified instantly.</div></div></div>`}`;
    [['vacation', '#2563EB'], ['sick', '#DC2626'], ['personal', '#D97706']].forEach(([k, c]) => UI.charts.ring($(`#ring-${k}`), { value: b[k].total - b[k].used, max: b[k].total, size: 76, stroke: 7, label: String(b[k].total - b[k].used), sub: `of ${b[k].total}`, color: c }));
    $$('.balance .ring .track').forEach((t) => (t.style.stroke = 'var(--surface-4)'));
    $('#btnReq').addEventListener('click', requestSheet);
    $$('[data-cancel]').forEach((btn) => btn.addEventListener('click', async () => { const ok = await UI.confirm({ title: 'Cancel this request?', message: 'Your manager will no longer see it.', confirmText: 'Cancel request', tone: 'danger', iconName: 'close-circle-outline' }); if (ok) { Store.data.timeOff = Store.data.timeOff.filter((x) => x.id !== btn.dataset.cancel); Store.save(); UI.toast('Request cancelled', { type: 'info' }); render(); } }));
    UI.reveal();
  }

  function requestSheet() {
    const me = Store.me();
    const s = EmpShell.sheet({ title: 'Request time off', sub: 'Your manager will be notified right away', body: `<form id="reqForm" class="col gap-12">
      <div class="field"><label>Type</label><div class="row gap-6" style="flex-wrap:wrap" id="types">${Object.entries(UI.leaveTypes).map(([k, v], i) => `<button type="button" class="chip ${i === 0 ? 'active' : ''}" data-type="${k}">${icon(v.icon)}${v.label}</button>`).join('')}</div></div>
      <div class="form-grid"><div class="field"><label>From</label><input class="input" type="date" name="from" value="${Store.addDays(today, 7)}" min="${today}" required></div><div class="field"><label>To</label><input class="input" type="date" name="to" value="${Store.addDays(today, 7)}" min="${today}" required></div></div>
      <div class="between text-sm" style="padding:2px 2px"><span class="subtle">Duration</span><b id="dur">1 day</b></div>
      <div class="field"><label>Note for your manager</label><textarea class="textarea" name="note" placeholder="Optional — e.g. family trip, appointment…"></textarea></div>
    </form>`, footer: `<button class="btn btn-primary btn-lg btn-block" id="submitReq">${icon('paper-plane-outline')}Send request</button>` });
    let type = 'vacation';
    const f = $('#reqForm', s.el);
    const dur = () => { const d = Store.diffDays(f.from.value, f.to.value) + 1; $('#dur', s.el).textContent = d > 0 ? `${d} day${d > 1 ? 's' : ''}` : 'Invalid range'; };
    $$('#types .chip', s.el).forEach((c) => c.addEventListener('click', () => { $$('#types .chip', s.el).forEach((x) => x.classList.remove('active')); c.classList.add('active'); type = c.dataset.type; }));
    f.from.addEventListener('change', () => { if (f.to.value < f.from.value) f.to.value = f.from.value; dur(); }); f.to.addEventListener('change', dur);
    $('#submitReq', s.el).addEventListener('click', () => {
      if (!f.reportValidity()) return; if (f.to.value < f.from.value) { UI.toast('End date must be after the start date', { type: 'error' }); return; }
      Store.addTimeOff({ employeeId: me.id, type, from: f.from.value, to: f.to.value, note: f.note.value.trim() });
      s.close(); UI.toast(`Request sent to ${Store.manager().first}`); render();
    });
  }
  document.addEventListener('DOMContentLoaded', () => { render(); Store.onChange((src) => { if (src === 'remote') render(); }); });
})();
