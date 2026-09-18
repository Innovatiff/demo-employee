/* Kiosk · Clock in / out */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, hm, time, range } = UI;
  const card = $('#card');
  const state = { pin: '', emp: null, timer: null, errTimer: null, view: 'pin' };
  const pinLen = () => Store.data.settings.kiosk.pinLength || 4;

  /* ---- clock ---- */
  function tick() {
    const d = new Date();
    const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const [hmPart, ampm] = t.split(' ');
    $('#clock').innerHTML = `${hmPart}<small>${ampm || ''}</small>`;
    $('#date').textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function people() {
    const list = Store.onShiftNow().sort((a, b) => a.entry.clockIn.localeCompare(b.entry.clockIn));
    $('#onCount').textContent = list.length ? `${list.length}` : '';
    $('#people').innerHTML = list.length ? list.slice(0, 8).map(({ entry, employee }) => { const st = Store.entryState(entry); return `<div class="k-person">${avatar(employee, 'md', { solid: true, status: st })}<div><div class="n">${esc(employee.first)}</div><div class="s">${st === 'break' ? 'On break' : 'since ' + time(entry.clockIn)}</div></div></div>`; }).join('') + (list.length > 8 ? `<div class="k-person"><span class="avatar md more" style="--h:220;background:rgba(255,255,255,.1);color:#fff">+${list.length - 8}</span></div>` : '') : `<div class="k-empty">Nobody is clocked in yet.</div>`;
  }

  /* ---- views ---- */
  function viewPin(msg) {
    state.view = 'pin'; state.pin = ''; state.emp = null; clearTimeout(state.timer); clearTimeout(state.errTimer); state.errTimer = null;
    card.innerHTML = `<div class="k-view"><h2>Welcome to ${esc(Store.data.company.shortName)}</h2><div class="sub" id="pinMsg">${msg || 'Enter your PIN to get started'}</div>
      <div class="pin-dots" id="dots">${Array.from({ length: pinLen() }, () => '<i></i>').join('')}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}<button class="key fn" data-k="clear">Clear</button><button class="key" data-k="0">0</button><button class="key fn" data-k="back" aria-label="Backspace">${icon('backspace-outline')}</button></div>
      <div class="k-foot">${Store.data.settings.kiosk.requirePhoto ? 'A photo is taken when you clock in' : 'Your time is recorded securely'}</div></div>`;
    $$('.key', card).forEach((k) => k.addEventListener('pointerdown', () => press(k.dataset.k)));
  }
  function clearError() {
    if (!state.errTimer) return;
    clearTimeout(state.errTimer); state.errTimer = null;
    const dots = $('#dots'); dots && dots.classList.remove('err', 'shake');
    const msg = $('#pinMsg'); if (msg) { msg.textContent = 'Enter your PIN to get started'; msg.classList.remove('err'); }
  }
  function press(k) {
    if (state.view !== 'pin') return;
    if (state.errTimer) { clearError(); state.pin = ''; }
    if (k === 'clear') state.pin = '';
    else if (k === 'back') state.pin = state.pin.slice(0, -1);
    else if (state.pin.length < pinLen()) state.pin += k;
    renderDots();
    if (state.pin.length === pinLen()) setTimeout(submitPin, 120);
  }
  function renderDots() { $$('#dots i').forEach((d, i) => d.classList.toggle('on', i < state.pin.length)); }
  function submitPin() {
    const emp = Store.employees({ active: true }).find((e) => e.pin === state.pin);
    if (!emp) {
      const dots = $('#dots'); dots.classList.add('err', 'shake'); $('#pinMsg').textContent = 'PIN not recognized — try again'; $('#pinMsg').classList.add('err');
      state.errTimer = setTimeout(() => { state.errTimer = null; state.pin = ''; renderDots(); dots.classList.remove('err', 'shake'); $('#pinMsg').textContent = 'Enter your PIN to get started'; $('#pinMsg').classList.remove('err'); }, 1200);
      return;
    }
    viewEmployee(emp);
  }

  function viewEmployee(emp) {
    state.view = 'emp'; state.emp = emp; clearTimeout(state.timer);
    const open = Store.openEntry(emp.id); const st = Store.entryState(open);
    const today = Store.todayStr();
    const shift = Store.shiftsFor(emp.id, today, today).find((s) => Store.at(s.date, s.end) > new Date()) || Store.shiftsFor(emp.id, today, today)[0] || null;
    const doneToday = Store.entriesFor(emp.id, today, today).filter((e) => e.clockOut).reduce((s, e) => s + Store.entryHours(e), 0);
    let status;
    if (st === 'on') status = `<span class="ic on">${icon('flash-outline')}</span><div><b>On shift · ${hm(Store.entryHours(open))}</b><span>Clocked in at ${time(open.clockIn)}${shift ? ` · shift ends ${UI.hmLabel(shift.end)}` : ''}</span></div>`;
    else if (st === 'break') status = `<span class="ic break">${icon('cafe-outline')}</span><div><b>On break · ${hm((Date.now() - new Date(open.breakStart)) / 3600000)}</b><span>Break started at ${time(open.breakStart)}</span></div>`;
    else status = `<span class="ic off">${icon('time-outline')}</span><div><b>Not clocked in</b><span>${shift ? `Scheduled ${range(shift.start, shift.end)} · ${esc(shift.label)}` : doneToday ? `${hm(doneToday)} logged today` : 'No shift scheduled today'}</span></div>`;
    const actions = st === 'off'
      ? `<button class="k-btn in" data-act="in">${icon('log-in-outline')}Clock in</button>`
      : st === 'on'
        ? `<div class="k-row"><button class="k-btn brk" data-act="break">${icon('cafe-outline')}Start break</button><button class="k-btn out" data-act="out">${icon('log-out-outline')}Clock out</button></div>`
        : `<div class="k-row"><button class="k-btn brk" data-act="endbreak">${icon('play-outline')}End break</button><button class="k-btn out" data-act="out">${icon('log-out-outline')}Clock out</button></div>`;
    card.innerHTML = `<div class="k-view k-emp">${avatar(emp, 'xxl', { solid: true })}<h2>Hi, ${esc(emp.first)}!</h2><div class="sub">${esc(Store.position(emp.positionId).name)} · ${esc(Store.location(emp.locationId).name)}</div><div class="status">${status}</div><div class="k-actions">${actions}<button class="k-btn ghost" data-act="cancel">Not you? Go back</button></div><div class="k-foot" id="countdown">Returns to the PIN screen in 20s</div></div>`;
    $$('[data-act]', card).forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    let left = 20; state.timer = setInterval(() => { left--; const c = $('#countdown'); if (c) c.textContent = `Returns to the PIN screen in ${left}s`; if (left <= 0) { clearInterval(state.timer); viewPin(); } }, 1000);
  }

  function act(a) {
    const emp = state.emp; clearInterval(state.timer);
    if (a === 'cancel') return viewPin();
    state.view = 'success'; // stop live re-renders while the action is applied
    if (a === 'in') { Store.clockIn(emp.id); return viewSuccess('in', 'You\'re clocked in', `Have a great shift, ${emp.first}! ☕`); }
    if (a === 'out') { const e = Store.clockOut(emp.id); return viewSuccess('out', 'You\'re clocked out', `${hm(Store.entryHours(e))} logged today. See you soon, ${emp.first}!`); }
    if (a === 'break') { Store.startBreak(emp.id); return viewSuccess('brk', 'Enjoy your break', `Tap in with your PIN when you're back.`); }
    if (a === 'endbreak') { Store.endBreak(emp.id); return viewSuccess('in', 'Welcome back', `Break ended. You're back on shift, ${emp.first}.`); }
  }

  function viewSuccess(kind, title, msg) {
    state.view = 'success';
    card.innerHTML = `<div class="k-view k-success"><div class="mark ${kind}"><svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-17"/></svg></div><h2>${esc(title)}</h2><div class="big-time">${time(new Date())}</div><div class="msg">${esc(msg)}</div><div class="bar"><span></span></div></div>`;
    people();
    state.timer = setTimeout(viewPin, 5000);
    // attach after the triggering click has finished bubbling
    setTimeout(() => { if (state.view === 'success') card.addEventListener('click', () => { if (state.view === 'success') { clearTimeout(state.timer); viewPin(); } }, { once: true }); }, 100);
  }

  function pinHelp() {
    const emps = Store.employees({ active: true });
    const m = UI.modal({ title: 'Demo PINs', sub: 'Any active employee can clock in — try a few to see the manager dashboard update live.', size: 'lg', body: `<div class="list" style="margin:0 -8px;max-height:52vh;overflow:auto">${emps.map((e) => { const open = Store.openEntry(e.id); const st = Store.entryState(open); return `<div class="list-item" data-pin="${e.pin}" style="cursor:pointer;padding:10px 12px;border-radius:12px;border:0">${avatar(e, 'md', { solid: true })}<div class="grow"><div class="t">${esc(e.name)}</div><div class="d">${esc(Store.position(e.positionId).name)} · ${esc(Store.location(e.locationId).name)}</div></div>${st === 'on' ? '<span class="badge green live">On shift</span>' : st === 'break' ? '<span class="badge amber">On break</span>' : '<span class="badge gray">Off</span>'}<span class="kbd" style="font-size:14px;padding:4px 10px;margin-left:8px">${e.pin}</span></div>`; }).join('')}</div>`, footer: `<button class="btn btn-secondary" data-close>Close</button>` });
    m.el.classList.add('dark-scope');
    $$('[data-pin]', m.el).forEach((r) => r.addEventListener('click', () => { m.close(); viewPin(); r.dataset.pin.split('').forEach((d, i) => setTimeout(() => press(d), 120 * (i + 1))); }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    tick(); setInterval(tick, 1000); people(); viewPin();
    $('#locBadge').innerHTML = `${icon('location-outline')}${esc(Store.data.locations[0].name)}`;
    $('#pinHelp').addEventListener('click', pinHelp);
    document.addEventListener('keydown', (e) => { if (state.view !== 'pin' || e.metaKey || e.ctrlKey) return; if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('back'); else if (e.key === 'Escape') press('clear'); });
    Store.onChange(() => { people(); if (state.view === 'emp' && state.emp) viewEmployee(Store.employee(state.emp.id)); });
    setInterval(people, 30000);
  });
})();
