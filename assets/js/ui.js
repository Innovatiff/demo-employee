/* ==========================================================================
   Crewline · Shared UI helpers (formatting, avatars, toasts, modals, charts)
   ========================================================================== */
(function (global) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function icon(name, cls = '') { return `<ion-icon name="${name}"${cls ? ` class="${cls}"` : ''}></ion-icon>`; }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ---------- formatting ---------- */
  const money = (n, opts = {}) => {
    if (opts.compact && Math.abs(n) >= 1000) { const k = n / 1000; return `$${(k >= 10 ? k.toFixed(0) : k.toFixed(1)).replace(/\.0$/, '')}K`; }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: opts.cents === false ? 0 : 2, minimumFractionDigits: opts.cents === false ? 0 : 2 }).format(n);
  };
  const num = (n, d = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n);
  const hours = (h, d = 1) => `${num(h, d)}h`;
  const hm = (h) => { const m = Math.round(h * 60); const hh = Math.floor(m / 60), mm = m % 60; return hh ? `${hh}h ${mm ? mm + 'm' : ''}`.trim() : `${mm}m`; };
  const time = (d) => { if (!d) return '—'; const dt = d instanceof Date ? d : new Date(d); return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
  const hmLabel = (hmStr) => { const [h, m] = hmStr.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: m ? '2-digit' : undefined }).replace(':00', ''); };
  const range = (a, b) => `${hmLabel(a)} – ${hmLabel(b)}`;
  const dateLong = (s, opts = {}) => Store.parseDate(s).toLocaleDateString('en-US', { weekday: opts.weekday === false ? undefined : 'short', month: 'short', day: 'numeric', ...(opts.year ? { year: 'numeric' } : {}) });
  const monthDay = (s) => Store.parseDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayName = (s, style = 'short') => Store.parseDate(s).toLocaleDateString('en-US', { weekday: style });
  const dateRange = (a, b) => a === b ? dateLong(a) : `${monthDay(a)} – ${monthDay(b)}`;
  const relative = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 45) return 'just now';
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.round(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  const initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const isToday = (s) => s === Store.todayStr();
  const dayLabel = (s) => isToday(s) ? 'Today' : s === Store.addDays(Store.todayStr(), 1) ? 'Tomorrow' : s === Store.addDays(Store.todayStr(), -1) ? 'Yesterday' : dateLong(s);

  /* ---------- avatars & badges ---------- */
  function avatar(emp, size = '', opts = {}) {
    if (!emp) return `<span class="avatar ${size}" style="--h:220">?</span>`;
    const status = opts.status ? `<i class="status ${opts.status === 'on' ? 'on' : opts.status === 'break' ? 'break' : ''}"></i>` : '';
    return `<span class="avatar ${size} ${opts.solid ? 'solid' : ''}" style="--h:${emp.hue}" title="${esc(emp.name)}">${initials(emp.name)}${status}</span>`;
  }
  function positionBadge(pos) { if (!pos) return ''; return `<span class="badge no-dot" style="background:${pos.color}14;color:${pos.color}"><i style="width:6px;height:6px;border-radius:50%;background:${pos.color};display:inline-block"></i>${esc(pos.name)}</span>`; }
  function statusBadge(status) {
    const map = {
      active: ['green', 'Active'], leave: ['amber', 'On leave'], inactive: ['gray', 'Inactive'],
      on: ['green live', 'On shift'], break: ['amber', 'On break'], done: ['blue', 'Completed'], late: ['amber', 'Running late'], missed: ['red', 'Missed'], scheduled: ['gray', 'Not in yet'],
      pending: ['amber', 'Pending'], approved: ['green', 'Approved'], declined: ['red', 'Declined'],
      paid: ['green', 'Paid'], open: ['blue', 'In progress'],
    };
    const [cls, label] = map[status] || ['gray', status];
    return `<span class="badge ${cls}">${label}</span>`;
  }
  const leaveTypes = {
    vacation: { label: 'Vacation', icon: 'airplane-outline', tone: 'blue' },
    sick: { label: 'Sick leave', icon: 'medkit-outline', tone: 'red' },
    personal: { label: 'Personal', icon: 'sunny-outline', tone: 'amber' },
    unpaid: { label: 'Unpaid', icon: 'wallet-outline', tone: 'gray' },
  };
  const leaveType = (t) => leaveTypes[t] || { label: t, icon: 'calendar-outline', tone: 'gray' };

  /* ---------- motion ---------- */
  function reveal(root = document) {
    const items = $$('[data-reveal]:not(.is-in)', root);
    items.forEach((node, i) => { const d = node.dataset.reveal ? Number(node.dataset.reveal) : i * 45; setTimeout(() => node.classList.add('is-in'), 30 + d); });
  }
  function countUp(node, to, opts = {}) {
    if (!node) return;
    const { decimals = 0, prefix = '', suffix = '', duration = 1100, format } = opts;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const fmt = (v) => format ? format(v) : `${prefix}${num(v, decimals)}${suffix}`;
    if (reduce) { node.textContent = fmt(to); return; }
    function frame(t) {
      const p = clamp((t - start) / duration, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(frame); else node.textContent = fmt(to);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- toasts ---------- */
  function toast(message, opts = {}) {
    let host = $('.toasts'); if (!host) { host = el('<div class="toasts"></div>'); document.body.appendChild(host); }
    const type = opts.type || 'success';
    const icons = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle', warning: 'warning' };
    const t = el(`<div class="toast ${type}">${icon(opts.icon || icons[type])}<span>${esc(message)}</span></div>`);
    host.appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 240); }, opts.duration || 3400);
    return t;
  }

  /* ---------- modal / drawer / confirm ---------- */
  function modal({ title, sub, body, footer, size = '', onClose, closeOnBackdrop = true }) {
    const ov = el(`<div class="overlay"><div class="modal ${size}" role="dialog" aria-modal="true">
      <div class="modal-head"><div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div><button class="icon-btn sm" data-close aria-label="Close">${icon('close-outline')}</button></div>
      <div class="modal-body"></div>${footer !== false ? '<div class="modal-foot"></div>' : ''}</div></div>`);
    const bodyEl = $('.modal-body', ov); if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    const footEl = $('.modal-foot', ov); if (footEl && footer) { if (typeof footer === 'string') footEl.innerHTML = footer; else footEl.appendChild(footer); }
    let closed = false;
    const close = () => { if (closed) return; closed = true; ov.classList.add('closing'); setTimeout(() => { ov.remove(); onClose && onClose(); }, 200); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); else if (closeOnBackdrop && e.target === ov) close(); });
    document.body.appendChild(ov);
    setTimeout(() => { const f = $('input, select, textarea, button.btn-primary', bodyEl); f && f.focus && f.focus(); }, 60);
    return { el: ov, body: bodyEl, foot: footEl, close };
  }
  function drawer({ title, sub, body, footer, onClose }) {
    const ov = el(`<div class="overlay drawer-overlay"><div class="drawer" role="dialog" aria-modal="true">
      <div class="drawer-head"><div><h3 style="font-size:18px">${esc(title)}</h3>${sub ? `<div class="card-sub">${esc(sub)}</div>` : ''}</div><button class="icon-btn sm" data-close aria-label="Close">${icon('close-outline')}</button></div>
      <div class="drawer-body"></div>${footer ? '<div class="drawer-foot"></div>' : ''}</div></div>`);
    const bodyEl = $('.drawer-body', ov); if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    const footEl = $('.drawer-foot', ov); if (footEl) { if (typeof footer === 'string') footEl.innerHTML = footer; else footEl.appendChild(footer); }
    let closed = false;
    const close = () => { if (closed) return; closed = true; ov.classList.add('closing'); setTimeout(() => { ov.remove(); onClose && onClose(); }, 200); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === ov) close(); });
    document.body.appendChild(ov);
    return { el: ov, body: bodyEl, foot: footEl, close };
  }
  function confirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'primary', iconName }) {
    return new Promise((resolve) => {
      const m = modal({
        title, size: 'sm',
        body: `<div class="row" style="align-items:flex-start;gap:14px">${iconName ? `<span class="list-icon ${tone === 'danger' ? 'red' : 'blue'}">${icon(iconName)}</span>` : ''}<p class="muted" style="font-size:14px;line-height:1.55">${esc(message)}</p></div>`,
        footer: `<button class="btn btn-secondary" data-close>${esc(cancelText)}</button><button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText)}</button>`,
        onClose: () => resolve(false),
      });
      $('[data-ok]', m.el).addEventListener('click', () => { resolve(true); m.close(); });
    });
  }

  /* ---------- menus ---------- */
  function menu(anchor, items, opts = {}) {
    closeMenus();
    const m = el('<div class="menu" role="menu"></div>');
    items.forEach((it) => {
      if (it === 'divider') { m.appendChild(el('<hr>')); return; }
      if (it.type === 'label') { m.appendChild(el(`<div class="menu-label">${esc(it.label)}</div>`)); return; }
      const b = el(`<button role="menuitem" class="${it.danger ? 'danger' : ''} ${it.active ? 'active' : ''}">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span></button>`);
      b.addEventListener('click', () => { closeMenus(); it.onClick && it.onClick(); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = opts.align === 'left' ? r.left : r.right - mw;
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = r.top - mh - 6;
    left = clamp(left, 8, window.innerWidth - mw - 8);
    m.style.left = `${left}px`; m.style.top = `${top}px`;
    m.style.transformOrigin = opts.align === 'left' ? 'top left' : 'top right';
    setTimeout(() => document.addEventListener('click', onDoc), 0);
    function onDoc(e) { if (!m.contains(e.target)) closeMenus(); }
    m._cleanup = () => document.removeEventListener('click', onDoc);
    return m;
  }
  function closeMenus() { $$('.menu').forEach((m) => { m._cleanup && m._cleanup(); m.remove(); }); }

  function bindSwitches(root = document) {
    $$('.switch', root).forEach((sw) => { if (sw._bound) return; sw._bound = true; sw.setAttribute('role', 'switch'); sw.tabIndex = 0; const toggle = () => { sw.classList.toggle('on'); sw.setAttribute('aria-checked', sw.classList.contains('on')); sw.dispatchEvent(new CustomEvent('toggle', { bubbles: true, detail: { on: sw.classList.contains('on') } })); }; sw.addEventListener('click', toggle); sw.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }); });
  }

  /* ======================================================================
     CHARTS (SVG, hand-rolled)
     ====================================================================== */
  const ns = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs = {}) { const n = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; }
  function niceTicks(max, count = 4) {
    if (max <= 0) return [0, 1, 2, 3, 4].map((i) => i);
    const raw = max / count; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag; const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const top = Math.ceil(max / step) * step; const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v); return ticks;
  }
  function roundedTop(x, y, w, h, r) { r = Math.min(r, w / 2, h); return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`; }
  function tip(container) { let t = $('.chart-tip', container); if (!t) { t = el('<div class="chart-tip"></div>'); container.appendChild(t); } return t; }
  function observe(container, render) {
    if (container._ro) container._ro.disconnect();
    let last = container.clientWidth;
    const ro = new ResizeObserver(() => { const w = container.clientWidth; if (Math.abs(w - last) > 4) { last = w; render(true); } });
    ro.observe(container); container._ro = ro;
  }

  /** Grouped column chart. series: [{name, values, color}] */
  function bars(container, opts) {
    const { labels, series, height = 230, format = (v) => num(v, 1), highlight = -1, yTicks = 4, animate = true, maxBar = 24 } = opts;
    container.classList.add('chart');
    const render = (resized = false) => {
      const W = Math.max(280, container.clientWidth || 600), H = height;
      const padL = 38, padR = 6, padT = 18, padB = 26;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const max = Math.max(1, ...series.flatMap((s) => s.values));
      const ticks = niceTicks(max, yTicks); const top = ticks[ticks.length - 1];
      const y = (v) => padT + plotH - (v / top) * plotH;
      container.querySelectorAll('svg, .legend').forEach((n) => n.remove());
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': opts.ariaLabel || 'Bar chart' });
      const grid = svgEl('g', { class: 'grid' }); const axis = svgEl('g', { class: 'axis' });
      ticks.forEach((t) => { grid.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t) })); const tx = svgEl('text', { x: padL - 8, y: y(t) + 4, 'text-anchor': 'end' }); tx.textContent = opts.yFormat ? opts.yFormat(t) : num(t); axis.appendChild(tx); });
      svg.appendChild(grid); svg.appendChild(axis);
      const n = labels.length, groupW = plotW / n, sc = series.length;
      const bw = Math.min(maxBar, (groupW * 0.62) / sc);
      const gap = 2; const totalW = bw * sc + gap * (sc - 1);
      const marks = svgEl('g');
      labels.forEach((label, i) => {
        const gx = padL + groupW * i;
        const tx = svgEl('text', { x: gx + groupW / 2, y: H - 8, 'text-anchor': 'middle', class: i === highlight ? 'hl' : '' }); tx.textContent = label; if (i === highlight) tx.style.fill = 'var(--text)'; if (i === highlight) tx.style.fontWeight = '600'; axis.appendChild(tx);
        const hit = svgEl('rect', { x: gx, y: padT, width: groupW, height: plotH, class: 'bar-hit' });
        const g = svgEl('g');
        series.forEach((s, si) => {
          const v = s.values[i] || 0; const x = gx + (groupW - totalW) / 2 + si * (bw + gap);
          const h = Math.max(v > 0 ? 2 : 0, (v / top) * plotH);
          const p = svgEl('path', { d: roundedTop(x, y(v), bw, h, 4), fill: s.color, class: 'bar', opacity: i === highlight || highlight < 0 ? 1 : 0.85 });
          if (animate && !resized) p.style.animationDelay = `${i * 45 + si * 20}ms`; else p.style.animation = 'none';
          g.appendChild(p);
          if (i === highlight && sc === 1 && v > 0) { const lb = svgEl('text', { x: x + bw / 2, y: y(v) - 7, 'text-anchor': 'middle', class: 'bar-label' }); lb.textContent = format(v); g.appendChild(lb); }
        });
        marks.appendChild(hit); marks.appendChild(g);
        const t = tip(container);
        const show = () => { t.innerHTML = `<div class="l">${esc(opts.tipLabel ? opts.tipLabel(i) : label)}</div>` + series.map((s) => `<div><i class="k" style="background:${s.color}"></i><span class="v">${esc(format(s.values[i] || 0))}</span>${sc > 1 ? ` <span class="l">${esc(s.name)}</span>` : ''}</div>`).join(''); t.style.left = `${gx + groupW / 2}px`; t.style.top = `${y(Math.max(...series.map((s) => s.values[i] || 0)))}px`; t.classList.add('show'); g.querySelectorAll('.bar').forEach((b) => b.classList.add('hover')); };
        const hide = () => { t.classList.remove('show'); g.querySelectorAll('.bar').forEach((b) => b.classList.remove('hover')); };
        hit.addEventListener('pointerenter', show); hit.addEventListener('pointerleave', hide); hit.addEventListener('focus', show); hit.addEventListener('blur', hide); hit.setAttribute('tabindex', '0');
      });
      svg.appendChild(marks); container.appendChild(svg);
      if (sc > 1) { const lg = el(`<div class="legend mt-12">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`); container.appendChild(lg); }
    };
    render(); observe(container, render);
  }

  /** Donut / part-to-whole. segments: [{label, value, color, icon}] */
  function donut(container, { segments, centerValue, centerLabel, size = 168, stroke = 16 }) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = (size - stroke) / 2, C = 2 * Math.PI * r, gapPx = 3;
    let offset = 0;
    const wrap = el(`<div class="donut"><div style="position:relative;width:${size}px;height:${size}px"></div><div class="donut-legend"></div></div>`);
    const holder = wrap.firstElementChild;
    const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, style: 'transform:rotate(-90deg)' });
    svg.appendChild(svgEl('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: 'var(--surface-4)', 'stroke-width': stroke }));
    const circles = [];
    segments.forEach((s) => {
      const len = (s.value / total) * C;
      const c = svgEl('circle', { cx: size / 2, cy: size / 2, r, class: 'seg', stroke: s.color, 'stroke-dasharray': `${Math.max(0, len - gapPx)} ${C - Math.max(0, len - gapPx)}`, 'stroke-dashoffset': C });
      svg.appendChild(c); circles.push([c, -offset]); offset += len;
    });
    holder.appendChild(svg);
    holder.appendChild(el(`<div class="center"><b>${esc(centerValue)}</b><span>${esc(centerLabel || '')}</span></div>`));
    const lg = $('.donut-legend', wrap);
    segments.forEach((s) => lg.appendChild(el(`<div class="li"><i style="background:${s.color}"></i><span class="l">${s.icon ? icon(s.icon) + ' ' : ''}${esc(s.label)}</span><span class="v">${esc(num(s.value))}</span></div>`)));
    container.innerHTML = ''; container.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => circles.forEach(([c, off]) => c.setAttribute('stroke-dashoffset', off))));
  }

  /** Single-series smooth area/line chart with crosshair tooltip */
  function area(container, opts) {
    const { labels, values, color = '#2563EB', height = 210, format = (v) => num(v), yFormat, yTicks = 4 } = opts;
    container.classList.add('chart');
    const id = `g${Math.random().toString(36).slice(2, 8)}`;
    const render = () => {
      const W = Math.max(280, container.clientWidth || 600), H = height;
      const padL = 44, padR = 14, padT = 18, padB = 26;
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const max = Math.max(1, ...values); const ticks = niceTicks(max, yTicks); const top = ticks[ticks.length - 1];
      const x = (i) => padL + (values.length === 1 ? plotW / 2 : (i / (values.length - 1)) * plotW);
      const y = (v) => padT + plotH - (v / top) * plotH;
      container.querySelectorAll('svg').forEach((n) => n.remove());
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': opts.ariaLabel || 'Trend chart' });
      const defs = svgEl('defs'); defs.innerHTML = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".9"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`; svg.appendChild(defs);
      const grid = svgEl('g', { class: 'grid' }); const axis = svgEl('g', { class: 'axis' });
      ticks.forEach((t) => { grid.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t) })); const tx = svgEl('text', { x: padL - 8, y: y(t) + 4, 'text-anchor': 'end' }); tx.textContent = yFormat ? yFormat(t) : num(t); axis.appendChild(tx); });
      labels.forEach((l, i) => { const tx = svgEl('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }); tx.textContent = l; axis.appendChild(tx); });
      svg.appendChild(grid); svg.appendChild(axis);
      // smooth path (Catmull-Rom → cubic Bézier)
      const pts = values.map((v, i) => [x(i), y(v)]);
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
      }
      const areaPath = svgEl('path', { d: `${d} L${pts[pts.length - 1][0]},${padT + plotH} L${pts[0][0]},${padT + plotH} Z`, fill: `url(#${id})`, class: 'area' });
      const line = svgEl('path', { d, stroke: color, class: 'line' });
      const len = 2000; line.style.strokeDasharray = len; line.style.strokeDashoffset = len; line.style.transition = 'stroke-dashoffset 1400ms var(--ease-out)';
      svg.appendChild(areaPath); svg.appendChild(line);
      const last = pts[pts.length - 1];
      svg.appendChild(svgEl('circle', { cx: last[0], cy: last[1], r: 5, fill: color, class: 'dot' }));
      const cross = svgEl('line', { x1: 0, x2: 0, y1: padT, y2: padT + plotH, class: 'crosshair' }); svg.appendChild(cross);
      const hoverDot = svgEl('circle', { r: 5, fill: color, class: 'dot', opacity: 0 }); svg.appendChild(hoverDot);
      const t = tip(container);
      const hit = svgEl('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent', style: 'cursor:crosshair' });
      hit.addEventListener('pointermove', (e) => {
        const rect = svg.getBoundingClientRect(); const px = (e.clientX - rect.left) * (W / rect.width);
        let i = Math.round(((px - padL) / plotW) * (values.length - 1)); i = clamp(i, 0, values.length - 1);
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.opacity = 1;
        hoverDot.setAttribute('cx', x(i)); hoverDot.setAttribute('cy', y(values[i])); hoverDot.setAttribute('opacity', 1);
        t.innerHTML = `<div class="l">${esc(labels[i])}</div><div><i class="k" style="background:${color}"></i><span class="v">${esc(format(values[i]))}</span></div>`;
        t.style.left = `${x(i) * (rect.width / W)}px`; t.style.top = `${y(values[i]) * (rect.height / H)}px`; t.classList.add('show');
      });
      hit.addEventListener('pointerleave', () => { cross.style.opacity = 0; hoverDot.setAttribute('opacity', 0); t.classList.remove('show'); });
      svg.appendChild(hit); container.appendChild(svg);
      requestAnimationFrame(() => requestAnimationFrame(() => { line.style.strokeDashoffset = 0; }));
    };
    render(); observe(container, render);
  }

  /** Progress ring (meter) */
  function ring(container, { value, max, size = 104, stroke = 10, label, sub, color }) {
    const r = (size - stroke) / 2, C = 2 * Math.PI * r; const p = clamp(max ? value / max : 0, 0, 1);
    container.innerHTML = `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/><circle class="fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${C}" stroke-dashoffset="${C}" ${color ? `style="stroke:${color}"` : ''}/></svg><div class="center"><b>${esc(label)}</b><span>${esc(sub || '')}</span></div></div>`;
    const fill = $('.fill', container);
    requestAnimationFrame(() => requestAnimationFrame(() => fill.setAttribute('stroke-dashoffset', C * (1 - p))));
  }

  /** Tiny sparkline for stat tiles */
  function sparkline(container, values, { color = '#2563EB', width = 96, height = 30 } = {}) {
    const max = Math.max(...values), min = Math.min(...values); const rng = max - min || 1;
    const x = (i) => (i / (values.length - 1)) * (width - 4) + 2, y = (v) => height - 3 - ((v - min) / rng) * (height - 6);
    const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="overflow:visible"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><circle cx="${x(values.length - 1)}" cy="${y(values[values.length - 1])}" r="3.5" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  }

  global.UI = { $, $$, esc, el, icon, qs, clamp, money, num, hours, hm, time, hmLabel, range, dateLong, monthDay, dayName, dateRange, relative, greeting, initials, isToday, dayLabel, avatar, positionBadge, statusBadge, leaveType, leaveTypes, reveal, countUp, toast, modal, drawer, confirm, menu, closeMenus, bindSwitches, charts: { bars, donut, area, ring, sparkline } };
})(window);
