/* Kiosk · Punch in / out — PIN, then one big button */
(function () {
  'use strict';
  const { $, $$, el, icon, esc, avatar, hm, time } = UI;
  const card = $('#card');
  const state = { pin: '', emp: null, timer: null, errTimer: null, view: 'pin' };
  const pinLen = () => Store.data.settings.kiosk.pinLength || 4;
  const RETURN_MS = 12000, SUCCESS_MS = 3500;

  /* ---- greeting + clock ---- */
  function tick() {
    const d = new Date();
    const [hmPart, ampm] = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).split(' ');
    $('#clock').innerHTML = `${hmPart}<small>${ampm || ''}</small>`;
    $('#date').textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const h = d.getHours();
    const g = h < 12 ? 'Good morning ☀️' : h < 17 ? 'Good afternoon 👋' : 'Good evening 🌙';
    const greet = $('#greet'); if (greet.dataset.g !== g) { greet.dataset.g = g; greet.innerHTML = `${g}<span>Enter your PIN to punch in or out</span>`; }
  }

  /* ---- views ---- */
  function viewPin() {
    state.view = 'pin'; state.pin = ''; state.emp = null; clearTimeout(state.timer); clearTimeout(state.errTimer); state.errTimer = null;
    card.innerHTML = `<div class="k-view"><h2>Enter your PIN</h2><div class="sub" id="pinMsg">${pinLen()} digits · punch in or out</div>
      <div class="pin-dots" id="dots">${Array.from({ length: pinLen() }, () => '<i></i>').join('')}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}<button class="key fn" data-k="clear">Clear</button><button class="key" data-k="0">0</button><button class="key fn" data-k="back" aria-label="Backspace">${icon('backspace-outline')}</button></div></div>`;
    $$('.key', card).forEach((k) => k.addEventListener('pointerdown', () => press(k.dataset.k)));
  }
  function clearError() {
    if (!state.errTimer) return;
    clearTimeout(state.errTimer); state.errTimer = null;
    const dots = $('#dots'); dots && dots.classList.remove('err', 'shake');
    const msg = $('#pinMsg'); if (msg) { msg.textContent = `${pinLen()} digits · punch in or out`; msg.classList.remove('err'); }
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
      state.errTimer = setTimeout(() => { state.errTimer = null; state.pin = ''; renderDots(); clearError(); }, 1200);
      return;
    }
    viewEmployee(emp);
  }

  function viewEmployee(emp) {
    state.view = 'emp'; state.emp = emp; clearTimeout(state.timer);
    const open = Store.openEntry(emp.id);
    const sub = open ? `Punched in at ${time(open.clockIn)} · ${hm(Store.entryHours(open))} so far` : 'Ready when you are';
    card.innerHTML = `<div class="k-view k-emp">${avatar(emp, 'xxl', { solid: true })}<h2>Hi, ${esc(emp.first)}!</h2><div class="sub">${sub}</div>
      <button class="k-punch ${open ? 'out' : 'in'}" data-act="${open ? 'out' : 'in'}">${icon(open ? 'log-out-outline' : 'log-in-outline')}${open ? 'Punch out' : 'Punch in'}</button>
      <div class="k-bar" style="--bar-dur:${RETURN_MS}ms"><span></span></div></div>`;
    $('[data-act]', card).addEventListener('click', () => act($('[data-act]', card).dataset.act));
    state.timer = setTimeout(viewPin, RETURN_MS);
  }

  function act(a) {
    const emp = state.emp; clearTimeout(state.timer);
    state.view = 'success'; // stop live re-renders while the action is applied
    if (a === 'in') { Store.clockIn(emp.id); return viewSuccess('in', 'Punched in', `Have a great shift, ${emp.first}! ☕`); }
    const e = Store.clockOut(emp.id);
    return viewSuccess('out', 'Punched out', `${hm(Store.entryHours(e))} today. See you soon, ${emp.first}!`);
  }

  function viewSuccess(kind, title, msg) {
    state.view = 'success';
    card.innerHTML = `<div class="k-view k-success"><div class="mark ${kind}"><svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-17"/></svg></div><h2>${esc(title)}</h2><div class="big-time">${time(new Date())}</div><div class="msg">${esc(msg)}</div><div class="k-bar" style="--bar-dur:${SUCCESS_MS}ms"><span></span></div></div>`;
    state.timer = setTimeout(viewPin, SUCCESS_MS);
    // tap anywhere on the confirmation to return early (listener lives on the view, so it dies with it)
    const view = $('.k-success', card);
    setTimeout(() => view.addEventListener('click', () => { clearTimeout(state.timer); viewPin(); }, { once: true }), 150);
  }

  function pinHelp() {
    const emps = Store.employees({ active: true });
    const m = UI.modal({ title: 'Demo PINs', sub: 'Tap a name to type their PIN. Punch-ins show up live in the manager console.', size: 'lg', body: `<div class="list" style="margin:0 -8px;max-height:52vh;overflow:auto">${emps.map((e) => { const open = Store.openEntry(e.id); return `<div class="list-item" data-pin="${e.pin}" style="cursor:pointer;padding:10px 12px;border-radius:12px;border:0">${avatar(e, 'md', { solid: true })}<div class="grow"><div class="t">${esc(e.name)}</div><div class="d">${esc(Store.position(e.positionId).name)} · ${esc(Store.location(e.locationId).name)}</div></div>${open ? '<span class="badge green live">Punched in</span>' : '<span class="badge gray">Out</span>'}<span class="kbd" style="font-size:14px;padding:4px 10px;margin-left:8px">${e.pin}</span></div>`; }).join('')}</div>`, footer: `<a class="btn btn-secondary" href="../index.html" style="margin-right:auto">${icon('grid-outline')}Demo portal</a><button class="btn btn-secondary" data-close>Close</button>` });
    m.el.classList.add('dark-scope');
    $$('[data-pin]', m.el).forEach((r) => r.addEventListener('click', () => { m.close(); viewPin(); r.dataset.pin.split('').forEach((d, i) => setTimeout(() => press(d), 120 * (i + 1))); }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    tick(); setInterval(tick, 1000); viewPin();
    $('#pinHelp').addEventListener('click', pinHelp);
    document.addEventListener('keydown', (e) => { if (state.view !== 'pin' || e.metaKey || e.ctrlKey) return; if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('back'); else if (e.key === 'Escape') press('clear'); });
    Store.onChange((src) => { if (src === 'remote' && state.view === 'emp' && state.emp) viewEmployee(Store.employee(state.emp.id)); });
  });
})();
