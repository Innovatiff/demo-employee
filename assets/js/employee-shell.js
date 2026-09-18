/* ==========================================================================
   Crewline · Employee app shell (phone frame, header, tab bar)
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, icon, esc, avatar } = UI;

  const TABS = [
    { id: 'home', label: 'Home', icon: 'home', iconOff: 'home-outline', href: 'index.html' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar', iconOff: 'calendar-outline', href: 'schedule.html' },
    { id: 'hours', label: 'Hours', icon: 'time', iconOff: 'time-outline', href: 'hours.html' },
    { id: 'messages', label: 'Chat', icon: 'chatbubbles', iconOff: 'chatbubbles-outline', href: 'messages.html', badge: () => { const v = Store.data.session.employeeId; const { channels, dms } = Store.channelsFor(v); return [...channels, ...dms].reduce((n, c) => n + Store.unreadCount(v, c.id), 0); } },
    { id: 'me', label: 'Me', icon: 'person', iconOff: 'person-outline', href: 'me.html' },
  ];
  const TITLES = { home: 'Home', schedule: 'My schedule', hours: 'My hours', pay: 'My pay', timeoff: 'Time off', messages: 'Messages', me: 'Profile' };

  function render() {
    const page = document.body.dataset.page;
    const me = Store.me();
    const stage = $('#stage');
    const content = $('#content');
    const head = content.dataset.title || TITLES[page] || 'Crewline';
    const sub = content.dataset.sub || '';
    const back = content.dataset.back || '';
    const hideHead = content.dataset.head === 'none';
    const now = new Date();

    const frame = el(`<div class="stage">
      <div class="stage-bg"><span></span><span></span><span></span></div>
      <div class="stage-side"><a class="pill" href="../index.html">${icon('arrow-back-outline')}Demo portal</a><a class="pill" href="../manager/index.html" target="_blank" rel="noopener">${icon('desktop-outline')}Manager console</a><a class="pill" href="../kiosk/index.html" target="_blank" rel="noopener">${icon('tablet-landscape-outline')}Clock-in kiosk</a></div>
      <div class="phone"><div class="screen">
        <div class="status-bar"><span>${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><span class="icons">${icon('cellular')}${icon('wifi')}${icon('battery-full')}</span></div>
        <div class="app-emp">
          ${hideHead ? '' : `<header class="app-head">${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${icon('arrow-back-outline')}</a>` : ''}<div class="grow"><h1>${esc(head)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${back ? '' : `<button class="icon-btn" id="notifBtn" aria-label="Notifications" style="position:relative">${icon('notifications-outline')}<span class="dot" id="notifDot" style="position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:50%;background:var(--red-500);border:2px solid var(--surface-3)"></span></button><a href="me.html" aria-label="Profile">${avatar(me, 'md')}</a>`}</header>`}
          <div class="app-body" id="appBody"></div>
          <nav class="tabbar" aria-label="Main">${TABS.map((t) => { const active = t.id === page || (page === 'pay' && t.id === 'me') || (page === 'timeoff' && t.id === 'me'); const b = t.badge ? t.badge() : 0; return `<a class="tab ${active ? 'active' : ''}" href="${t.href}" ${active ? 'aria-current="page"' : ''}>${icon(active ? t.icon : t.iconOff)}<span>${t.label}</span>${b ? `<span class="badge-dot">${b}</span>` : ''}</a>`; }).join('')}</nav>
        </div>
      </div></div>
      <div class="stage-caption"><b>Employee app · ${esc(me.name)}</b>${esc(Store.position(me.positionId).name)} at ${esc(Store.data.company.name)}. Changes here sync live with the manager console.</div>
    </div>`);
    // move the page content into the app body
    const body = $('#appBody', frame);
    while (content.firstChild) body.appendChild(content.firstChild);
    content.remove();
    stage.replaceWith(frame);
    document.title = `${head} · Crewline`;

    const nb = $('#notifBtn');
    if (nb) {
      const notifs = Store.notifications(me.id);
      $('#notifDot').hidden = notifs.length === 0;
      nb.addEventListener('click', () => sheet({ title: 'Notifications', sub: notifs.length ? `${notifs.length} recent` : 'Nothing new', body: notifs.length ? `<div class="list">${notifs.map((n) => `<a class="list-item" href="${n.href}" style="padding:12px 4px"><span class="list-icon ${n.tone}">${icon(n.icon)}</span><div class="grow"><div class="t" style="font-weight:500">${n.text}</div><div class="d">${UI.relative(n.at)}</div></div></a>`).join('')}</div>` : `<div class="empty">${icon('checkmark-done-outline')}<div class="t">You're all caught up</div></div>` }));
    }
    // toasts inside the phone
    const host = el('<div class="toasts" style="position:absolute;left:16px;right:16px;bottom:calc(var(--tabbar-h) + 12px);"></div>');
    $('.app-emp').appendChild(host);
  }

  /** Bottom sheet inside the phone */
  function sheet({ title, sub, body, footer }) {
    const ov = el(`<div class="sheet-overlay"><div class="sheet"><div class="handle"></div><div class="between" style="align-items:flex-start;margin-bottom:12px"><div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div><button class="icon-btn sm" data-close aria-label="Close">${icon('close-outline')}</button></div><div class="sheet-body"></div>${footer ? '<div class="sheet-foot mt-16 col gap-8"></div>' : ''}</div></div>`);
    const b = $('.sheet-body', ov); if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
    if (footer) { const f = $('.sheet-foot', ov); if (typeof footer === 'string') f.innerHTML = footer; else f.appendChild(footer); }
    $('.app-emp').appendChild(ov);
    const close = () => { ov.classList.add('closing'); setTimeout(() => ov.remove(), 220); };
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
    return { el: ov, body: b, foot: $('.sheet-foot', ov), close };
  }

  document.addEventListener('DOMContentLoaded', () => { render(); UI.reveal(); UI.bindSwitches(); });
  global.EmpShell = { sheet, TABS };
})(window);
