/* ==========================================================================
   Crewline · Chat module (shared by the Manager console and Employee app)
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, icon, esc, avatar, time, relative } = UI;

  const REPLIES = {
    generic: ['Sounds good 👍', 'On it!', 'Thanks for the heads up 🙏', 'Got it, will do.', 'Perfect, thanks!', 'Can do — see you then.', '👍', 'Noted! Thanks.', 'Great, appreciate it.', 'Copy that ☕'],
    question: ['Yes, I can help with that!', 'Let me check and get back to you in a few.', 'I think so — let me confirm with the team.', 'Sure! What time works best?'],
    thanks: ['Anytime! 😊', 'No problem at all.', 'Of course!', 'Happy to help 🙌'],
    greeting: ['Hey! 👋', 'Hi there! How\'s it going?', 'Morning! ☀️', 'Hey hey 👋'],
  };
  function pickReply(text) {
    const t = text.toLowerCase();
    const pool = /\?$/.test(t.trim()) || /\b(can|could|anyone|who|when|where|what)\b/.test(t) ? REPLIES.question : /thank/.test(t) ? REPLIES.thanks : /^(hi|hey|hello|morning|good morning|yo)\b/.test(t) ? REPLIES.greeting : REPLIES.generic;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function members(channel) {
    const all = Store.employees({ active: true });
    if (channel.type === 'dm') return [Store.employee(channel.otherId)].filter(Boolean);
    if (channel.id === 'downtown') return all.filter((e) => e.locationId === 'L1');
    if (channel.id === 'riverside') return all.filter((e) => e.locationId === 'L2');
    return all;
  }

  function mount(root, opts) {
    const viewerId = opts.viewerId;
    const personas = [Store.data.session.managerId, Store.data.session.employeeId];
    const isManager = viewerId === Store.data.session.managerId;
    const state = { current: null, typingTimer: null };

    root.classList.add('chat');
    root.innerHTML = `<aside class="chat-side"><div class="head"><label class="search">${icon('search-outline')}<input type="search" placeholder="Search conversations" aria-label="Search conversations"></label></div><div class="lists"></div></aside>
      <section class="chat-main"><div class="chat-head"></div><div class="chat-body"></div><div class="chat-compose"></div></section>`;
    const lists = $('.lists', root), head = $('.chat-head', root), body = $('.chat-body', root), compose = $('.chat-compose', root);

    function allConversations() { const { channels, dms } = Store.channelsFor(viewerId); return [...channels, ...dms]; }
    function find(id) { return allConversations().find((c) => c.id === id) || null; }

    function renderList() {
      const q = ($('.search input', root).value || '').toLowerCase();
      const { channels, dms } = Store.channelsFor(viewerId);
      const item = (c) => {
        const last = Store.lastMessage(c.id); const unread = Store.unreadCount(viewerId, c.id);
        const preview = last ? `${last.fromId === viewerId ? 'You: ' : c.type === 'dm' ? '' : Store.employee(last.fromId).first + ': '}${last.text}` : c.description || 'No messages yet';
        return `<div class="conv ${state.current === c.id ? 'active' : ''}" data-id="${c.id}" role="button" tabindex="0">${c.type === 'dm' ? avatar(Store.employee(c.otherId), 'sm') : `<span class="hash">#</span>`}<div class="grow" style="min-width:0"><div class="n"><span class="truncate">${esc(c.name)}</span>${last ? `<time>${relative(last.at)}</time>` : ''}</div><div class="p">${esc(preview)}</div></div>${unread ? `<span class="unread">${unread}</span>` : ''}</div>`;
      };
      const f = (arr) => arr.filter((c) => !q || c.name.toLowerCase().includes(q));
      const dmsSorted = f(dms).sort((a, b) => { const la = Store.lastMessage(a.id), lb = Store.lastMessage(b.id); return (lb ? lb.at : '').localeCompare(la ? la.at : ''); });
      lists.innerHTML = `<div class="chat-label">Channels</div>${f(channels).map(item).join('')}<div class="chat-label">Direct messages <button class="icon-btn sm" data-newdm aria-label="New message" title="New message">${icon('create-outline')}</button></div>${dmsSorted.map(item).join('') || '<div class="text-sm subtle" style="padding:6px 10px">No direct messages yet</div>'}`;
      $$('.conv', lists).forEach((n) => { n.addEventListener('click', () => open(n.dataset.id)); n.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(n.dataset.id); }); });
      const nd = $('[data-newdm]', lists); nd && nd.addEventListener('click', newDm);
    }

    function newDm() {
      const people = Store.employees({ active: true }).filter((e) => e.id !== viewerId);
      const m = UI.modal({ title: 'New message', sub: 'Start a direct conversation', body: `<div class="list" style="max-height:340px;overflow:auto;margin:0 -8px">${people.map((p) => `<button class="list-item" data-id="${p.id}" style="text-align:left;width:100%;border-radius:10px;border:0;padding:10px 12px">${avatar(p, 'md')}<div class="grow"><div class="t">${esc(p.name)}</div><div class="d">${esc(Store.position(p.positionId).name)} · ${esc(Store.location(p.locationId).name)}</div></div>${icon('chevron-forward-outline')}</button>`).join('')}</div>`, footer: false });
      $$('[data-id]', m.el).forEach((b) => b.addEventListener('click', () => { m.close(); const id = Store.dmId(viewerId, b.dataset.id); if (!Store.messagesIn(id).length) { /* create conversation lazily */ } open(id, Store.employee(b.dataset.id)); }));
    }

    function open(id, otherEmp) {
      let c = find(id);
      if (!c && otherEmp) c = { id, type: 'dm', otherId: otherEmp.id, name: otherEmp.name };
      if (!c) return;
      state.current = c.id; root.classList.add('show-conv');
      if (opts.mobile) { const app = root.closest('.app-emp'); app && app.classList.add('conv-open'); }
      Store.markRead(viewerId, c.id);
      renderList(); renderHead(c); renderMessages(c, false); renderCompose(c);
      if (opts.onOpen) opts.onOpen(c);
      try { history.replaceState(null, '', `${location.pathname}?c=${encodeURIComponent(c.id)}`); } catch (e) { }
    }

    function renderHead(c) {
      const mem = members(c);
      const other = c.type === 'dm' ? Store.employee(c.otherId) : null;
      const onShift = other ? Store.openEntry(other.id) : null;
      head.innerHTML = `<button class="icon-btn back" data-back aria-label="Back">${icon('arrow-back-outline')}</button>${other ? avatar(other, 'md', { status: onShift ? Store.entryState(onShift) : null }) : `<span class="hash" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);font-weight:800;font-size:17px">#</span>`}<div class="grow" style="min-width:0"><div class="t truncate">${esc(c.name)}</div><div class="d truncate">${other ? `${esc(Store.position(other.positionId).name)} · ${esc(Store.location(other.locationId).name)}${onShift ? ' · <span style="color:var(--green-600);font-weight:600">On shift</span>' : ''}` : `${esc(c.description || '')} · ${mem.length} members`}</div></div>${c.type !== 'dm' ? `<div class="avatar-stack">${mem.slice(0, 4).map((e) => avatar(e, 'sm')).join('')}${mem.length > 4 ? `<span class="avatar sm more">+${mem.length - 4}</span>` : ''}</div>` : ''}<button class="icon-btn" data-info aria-label="Details">${icon('information-circle-outline')}</button>`;
      $('[data-back]', head).addEventListener('click', () => { root.classList.remove('show-conv'); state.current = null; renderList(); const app = root.closest('.app-emp'); app && app.classList.remove('conv-open'); try { history.replaceState(null, '', location.pathname); } catch (e) { } });
      $('[data-info]', head).addEventListener('click', () => {
        UI.modal({ title: c.type === 'dm' ? c.name : `#${c.name}`, sub: c.type === 'dm' ? 'Direct message' : c.description, body: `<div class="list" style="margin:0 -8px">${mem.map((e) => `<div class="list-item" style="padding:9px 12px">${avatar(e, 'md')}<div class="grow"><div class="t">${esc(e.name)}</div><div class="d">${esc(Store.position(e.positionId).name)} · ${esc(Store.location(e.locationId).name)}</div></div>${Store.openEntry(e.id) ? '<span class="badge green live">On shift</span>' : ''}</div>`).join('')}</div>`, footer: `<button class="btn btn-secondary" data-close>Close</button>` });
      });
    }

    function renderMessages(c, smooth) {
      const msgs = Store.messagesIn(c.id);
      let html = '', lastDay = '', lastFrom = '', lastAt = 0;
      if (!msgs.length) html = `<div class="empty" style="margin:auto">${icon('chatbubble-ellipses-outline')}<div class="t">No messages yet</div><div>Say hello to ${esc(c.name)} 👋</div></div>`;
      msgs.forEach((m) => {
        const d = new Date(m.at); const day = Store.dateStr(d);
        if (day !== lastDay) { html += `<div class="day-sep">${UI.dayLabel(day)}</div>`; lastDay = day; lastFrom = ''; }
        const from = Store.employee(m.fromId) || { name: 'Unknown', hue: 200 };
        const cont = m.fromId === lastFrom && (d - lastAt) < 5 * 60000;
        html += `<div class="msg ${m.fromId === viewerId ? 'mine' : ''} ${cont ? 'cont' : ''}">${avatar(from, 'sm')}<div style="min-width:0"><div class="meta"><b>${esc(from.name)}</b><span>${time(d)}</span></div><div class="bubble">${esc(m.text)}</div>${cont ? `<div class="stamp">${time(d)}</div>` : ''}</div></div>`;
        lastFrom = m.fromId; lastAt = d;
      });
      body.innerHTML = html;
      if (c.type === 'dm' && personas.includes(c.otherId) && personas.includes(viewerId)) body.insertAdjacentHTML('beforeend', `<div class="demo-note" style="align-self:center;margin:14px 0 4px">${icon('sparkles-outline')}Demo tip: open the ${isManager ? 'Employee app' : 'Manager console'} in another tab and reply as ${esc(c.name.split(' ')[0])} — messages sync live.</div>`);
      body.scrollTo({ top: body.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }

    function renderCompose(c) {
      if (c.restricted && !isManager) { compose.innerHTML = `<div class="row text-sm subtle" style="padding:6px 4px;width:100%;justify-content:center">${icon('lock-closed-outline')}Only managers can post in #${esc(c.name)}</div>`; return; }
      compose.innerHTML = `<div class="box"><textarea rows="1" placeholder="Message ${c.type === 'dm' ? esc(c.name.split(' ')[0]) : '#' + esc(c.name)}" aria-label="Message"></textarea><button class="icon-btn sm" data-emoji aria-label="Emoji" title="Emoji">${icon('happy-outline')}</button><button class="icon-btn sm" data-attach aria-label="Attach" title="Attach">${icon('attach-outline')}</button></div><button class="send" data-send aria-label="Send">${icon('send')}</button>`;
      const ta = $('textarea', compose);
      const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
      ta.addEventListener('input', grow);
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      $('[data-send]', compose).addEventListener('click', send);
      $('[data-emoji]', compose).addEventListener('click', () => { const em = ['😊', '👍', '🙌', '☕', '🎉', '🙏', '😄', '✅']; ta.value += (ta.value && !ta.value.endsWith(' ') ? ' ' : '') + em[Math.floor(Math.random() * em.length)]; ta.focus(); grow(); });
      $('[data-attach]', compose).addEventListener('click', () => UI.toast('Attachments are turned off in the demo', { type: 'info' }));
      if (!opts.mobile) setTimeout(() => ta.focus(), 50);
      function send() {
        const text = ta.value.trim(); if (!text) return;
        Store.sendMessage(c.id, viewerId, text); ta.value = ''; grow();
        renderList(); renderMessages(c, true);
        scheduleReply(c, text);
      }
    }

    function scheduleReply(c, text) {
      if (c.restricted) return;
      const pool = members(c).filter((e) => e.id !== viewerId && !personas.includes(e.id));
      if (!pool.length) return;
      const who = pool[Math.floor(Math.random() * pool.length)];
      clearTimeout(state.typingTimer);
      state.typingTimer = setTimeout(() => {
        if (state.current !== c.id) return;
        const t = el(`<div class="msg typing-row">${avatar(who, 'sm')}<div><div class="meta"><b>${esc(who.name)}</b><span>typing…</span></div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div></div>`);
        body.appendChild(t); body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
        setTimeout(() => { t.remove(); Store.sendMessage(c.id, who.id, pickReply(text)); Store.markRead(viewerId, c.id); if (state.current === c.id) { renderMessages(c, true); renderList(); } }, 1400 + Math.random() * 900);
      }, 900 + Math.random() * 1200);
    }

    // initial
    renderList();
    $('.search input', root).addEventListener('input', renderList);
    const initial = opts.initial && find(opts.initial) ? opts.initial : (opts.mobile ? null : (Store.channelsFor(viewerId).channels[0] || {}).id);
    if (initial) open(initial); else { head.innerHTML = ''; body.innerHTML = `<div class="empty" style="margin:auto">${icon('chatbubbles-outline')}<div class="t">Pick a conversation</div></div>`; compose.innerHTML = ''; }
    Store.onChange((src) => { if (src !== 'remote') return; renderList(); const c = state.current && find(state.current); if (c) { Store.markRead(viewerId, c.id); renderMessages(c, true); renderHead(c); } });
    return { open, refresh: renderList };
  }

  global.Chat = { mount, members };
})(window);
