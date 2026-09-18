/* ==========================================================================
   Crewline · Demo data store
   - Seeds a realistic dataset relative to "today" on first load
   - Persists to localStorage so the Manager console, Employee app and Kiosk
     share the same live state (cross-tab updates via the storage event)
   ========================================================================== */
(function (global) {
  'use strict';

  const KEY = 'crewline.demo.v1';
  const listeners = new Set();

  /* ---------- tiny deterministic PRNG (mulberry32) ---------- */
  function rng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- date helpers (local time) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); }
  function diffDays(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
  function startOfWeek(s) { const d = parseDate(s); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return dateStr(d); }
  function weekDays(startStr) { return Array.from({ length: 7 }, (_, i) => addDays(startStr, i)); }
  function todayStr() { return dateStr(new Date()); }
  function now() { return new Date(); }
  function at(dateS, hm, offsetMin = 0) { const [h, m] = hm.split(':').map(Number); const d = parseDate(dateS); d.setHours(h, m + offsetMin, 0, 0); return d; }
  function toHM(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function hmToMin(hm) { const [h, m] = hm.split(':').map(Number); return h * 60 + m; }

  let counter = 1000;
  function uid(prefix = 'id') { return `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`; }

  /* ======================================================================
     SEED
     ====================================================================== */
  function seed() {
    const today = todayStr();
    const thisMonday = startOfWeek(today);

    const company = {
      name: 'Lumen Coffee Roasters',
      shortName: 'Lumen',
      industry: 'Hospitality',
      timezone: 'Local time',
      payFrequency: 'Bi-weekly',
      overtimeAfter: 40,
      weekStart: 'Monday',
    };

    const locations = [
      { id: 'L1', name: 'Downtown', address: '120 Market Street', opens: '06:00', closes: '22:00' },
      { id: 'L2', name: 'Riverside', address: '8 Harbor Walk', opens: '07:00', closes: '21:00' },
    ];

    const positions = [
      { id: 'barista', name: 'Barista', color: '#2563EB', rate: 18.5 },
      { id: 'lead', name: 'Shift Lead', color: '#7C3AED', rate: 23 },
      { id: 'kitchen', name: 'Kitchen', color: '#EA580C', rate: 20 },
      { id: 'manager', name: 'General Manager', color: '#059669', rate: 34 },
    ];

    const E = (id, first, last, positionId, locationId, rate, hiredAt, pin, hue, extra = {}) => ({
      id, first, last, name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@lumen.coffee`,
      phone: extra.phone || `(415) 555-${String(hash(id) % 9000 + 1000)}`,
      positionId, locationId, rate, hiredAt, pin, hue,
      status: extra.status || 'active',
      type: extra.type || 'Full-time',
      pattern: extra.pattern, // weekday indexes 0=Mon .. 6=Sun
      shiftPref: extra.shiftPref,
      balances: extra.balances || { vacation: { total: 15, used: 4 }, sick: { total: 8, used: 1 }, personal: { total: 4, used: 1 } },
    });

    const employees = [
      E('E001', 'Alex', 'Rivera', 'manager', 'L1', 34, '2021-03-08', '0000', 152, { pattern: [0, 1, 2, 3, 4], shiftPref: ['mgr'], phone: '(415) 555-0100' }),
      E('E002', 'Maya', 'Chen', 'lead', 'L1', 23, '2022-06-13', '1234', 212, { pattern: [0, 1, 2, 3, 4, 5], shiftPref: ['open', 'mid', 'open', 'mid', 'open', 'mid'], phone: '(415) 555-0142', balances: { vacation: { total: 15, used: 3 }, sick: { total: 8, used: 1 }, personal: { total: 4, used: 1 } } }),
      E('E003', 'Jordan', 'Blake', 'barista', 'L1', 18.5, '2023-01-23', '2580', 24, { pattern: [0, 1, 3, 4, 5], shiftPref: ['close'] }),
      E('E004', 'Priya', 'Patel', 'barista', 'L1', 19, '2022-09-05', '4471', 330, { pattern: [1, 2, 3, 4, 6], shiftPref: ['open', 'mid'] }),
      E('E005', 'Liam', "O'Connor", 'kitchen', 'L1', 20, '2021-11-15', '7391', 30, { pattern: [0, 1, 2, 3, 4], shiftPref: ['k1'] }),
      E('E006', 'Sofia', 'Martinez', 'lead', 'L2', 23.5, '2020-08-03', '5824', 350, { pattern: [0, 1, 2, 4, 5], shiftPref: ['mid', 'close'] }),
      E('E007', 'Ethan', 'Walker', 'barista', 'L2', 18, '2024-02-19', '6135', 190, { pattern: [0, 2, 3, 5, 6], shiftPref: ['close'], type: 'Part-time' }),
      E('E008', 'Amara', 'Okafor', 'barista', 'L2', 18.5, '2023-05-08', '9042', 268, { pattern: [1, 2, 3, 4, 5], shiftPref: ['open'] }),
      E('E009', 'Noah', 'Kim', 'kitchen', 'L2', 20.5, '2022-03-28', '3167', 95, { pattern: [0, 1, 2, 3, 5], shiftPref: ['k2'] }),
      E('E010', 'Isabella', 'Rossi', 'barista', 'L1', 18.5, '2022-11-07', '8256', 300, { pattern: [0, 1, 2, 3, 4], shiftPref: ['mid'], status: 'leave' }),
      E('E011', 'Marcus', 'Johnson', 'kitchen', 'L1', 20, '2023-08-14', '1948', 120, { pattern: [1, 2, 3, 5, 6], shiftPref: ['k2'] }),
      E('E012', 'Hannah', 'Lee', 'barista', 'L2', 18, '2024-06-03', '7723', 250, { pattern: [0, 2, 4, 5, 6], shiftPref: ['mid', 'close'], type: 'Part-time' }),
      E('E013', 'Diego', 'Fernandez', 'lead', 'L1', 22.5, '2021-07-19', '4589', 60, { pattern: [1, 2, 3, 4, 5, 6], shiftPref: ['close'] }),
      E('E014', 'Zoe', 'Nguyen', 'barista', 'L1', 18, addDays(today, -9), '6602', 170, { pattern: [0, 2, 3, 5], shiftPref: ['mid'], type: 'Part-time' }),
    ];

    // Shift templates
    const T = {
      open: { start: '06:00', end: '14:00', label: 'Opening' },
      mid: { start: '09:30', end: '17:30', label: 'Mid' },
      close: { start: '14:00', end: '22:00', label: 'Closing' },
      k1: { start: '07:00', end: '15:00', label: 'Kitchen AM' },
      k2: { start: '11:00', end: '19:00', label: 'Kitchen PM' },
      mgr: { start: '08:00', end: '17:00', label: 'Manager' },
    };

    /* ---- shifts: 5 weeks back, this week, next week ---- */
    const shifts = [];
    const leaveRange = { from: addDays(today, -3), to: addDays(today, 4) }; // Isabella's leave
    for (let w = -5; w <= 1; w++) {
      const monday = addDays(thisMonday, w * 7);
      employees.forEach((emp) => {
        if (emp.status === 'inactive') return;
        const r = rng(hash(emp.id + monday));
        emp.pattern.forEach((dow, i) => {
          const date = addDays(monday, dow);
          if (date < emp.hiredAt) return;
          if (emp.id === 'E010' && date >= leaveRange.from && date <= leaveRange.to) return;
          // occasionally skip a day for variety (never for the demo employee)
          if (emp.id !== 'E002' && r() < 0.06) return;
          const prefs = emp.shiftPref;
          const tKey = prefs[i % prefs.length];
          const t = T[tKey];
          shifts.push({
            id: `S_${emp.id}_${date}`,
            employeeId: emp.id, positionId: emp.positionId, locationId: emp.locationId,
            date, start: t.start, end: t.end, label: t.label,
            published: w <= 0,
            seeded: true,
          });
        });
      });
    }

    const data = {
      version: 1,
      seedDate: today,
      company, locations, positions, employees, shifts,
      timeEntries: [],
      timeOff: [],
      channels: [
        { id: 'general', name: 'General', type: 'channel', description: 'Team-wide chat for everyone' },
        { id: 'announcements', name: 'Announcements', type: 'channel', description: 'Updates from management', restricted: true },
        { id: 'downtown', name: 'Downtown', type: 'channel', description: 'Downtown store crew' },
        { id: 'riverside', name: 'Riverside', type: 'channel', description: 'Riverside store crew' },
      ],
      messages: [],
      events: [],
      payrollRuns: {},
      settings: {
        kiosk: { pinLength: 4, requirePhoto: false, autoClockOut: true, breakMinutes: 30, geofence: false },
        notifications: { shiftReminders: true, chat: true, weeklySummary: true, timeOffUpdates: true },
        employeeApp: { shiftReminders: true, chat: true, weeklySummary: false, payday: true },
        schedulePublished: addDays(today, -2),
      },
      session: { managerId: 'E001', employeeId: 'E002' },
      demoCreatedAt: new Date().toISOString(),
    };

    /* ---- time entries: simulate every past shift, and today's up to now ---- */
    simulateEntries(data);

    /* ---- time off ---- */
    const TO = (id, employeeId, type, from, to, status, note, createdDaysAgo, decidedBy) => ({
      id, employeeId, type, from, to, days: diffDays(from, to) + 1, status, note,
      createdAt: new Date(Date.now() - createdDaysAgo * 86400000 - hash(id) % 20000000).toISOString(),
      decidedBy: status === 'pending' ? null : (decidedBy || 'E001'),
    });
    data.timeOff = [
      TO('TO1', 'E002', 'vacation', addDays(today, 18), addDays(today, 22), 'pending', 'Family trip to Lake Tahoe — I already lined up cover for the opening shifts.', 1),
      TO('TO2', 'E003', 'personal', addDays(today, 3), addDays(today, 3), 'pending', 'Dentist appointment in the morning.', 2),
      TO('TO3', 'E007', 'sick', addDays(today, -1), today, 'pending', 'Came down with the flu. Doctor\'s note attached.', 1),
      TO('TO4', 'E010', 'vacation', leaveRange.from, leaveRange.to, 'approved', 'Wedding in Italy 🇮🇹', 24),
      TO('TO5', 'E006', 'vacation', addDays(today, 10), addDays(today, 14), 'approved', 'Long weekend away.', 9),
      TO('TO6', 'E004', 'personal', addDays(today, -8), addDays(today, -8), 'approved', 'Moving day.', 15),
      TO('TO7', 'E009', 'unpaid', addDays(today, 25), addDays(today, 27), 'declined', 'Music festival.', 5),
      TO('TO8', 'E005', 'sick', addDays(today, -12), addDays(today, -11), 'approved', 'Stomach bug.', 13),
      TO('TO9', 'E012', 'vacation', addDays(today, -30), addDays(today, -26), 'approved', 'Visiting family.', 45),
      TO('TO10', 'E011', 'personal', addDays(today, 6), addDays(today, 6), 'declined', 'Need the day for an errand.', 4),
    ];

    /* ---- messages ---- */
    const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
    const M = (channelId, fromId, text, ago) => ({ id: uid('m'), channelId, fromId, text, at: minsAgo(ago), seeded: true });
    data.messages = [
      M('announcements', 'E001', 'Welcome to the new team app! 🎉 Schedules, hours, pay and time off all live here now. Ping me if anything looks off.', 60 * 24 * 6),
      M('announcements', 'E001', 'New fall menu launches Monday 🍂 Training sheets are in the back office — please read them before your next shift.', 60 * 24 * 2 + 30),
      M('announcements', 'E001', 'Payroll for this period runs Friday. Please review your hours in the app by Thursday 5pm.', 60 * 5),

      M('general', 'E006', 'Riverside hit a record 412 orders yesterday 🎉 Amazing work everyone!', 60 * 26),
      M('general', 'E002', 'Huge!! Congrats Riverside crew 👏', 60 * 25 + 40),
      M('general', 'E003', 'Anyone able to cover my closing shift on Saturday? Family thing came up.', 60 * 4 + 12),
      M('general', 'E004', 'I can take it if Alex is okay with it 🙋‍♀️', 60 * 3 + 48),
      M('general', 'E001', 'Approved — thanks Priya, I\'ll update the schedule now.', 60 * 3 + 20),
      M('general', 'E008', 'The new oat milk is a hit, we ran out by 2pm 😅', 95),
      M('general', 'E013', 'Same downtown. I added it to the order for tomorrow.', 80),

      M('downtown', 'E013', 'Morning team — espresso machine #2 is fixed, back in service.', 60 * 8),
      M('downtown', 'E002', 'Lifesaver 🙏 Opening was rough with one machine.', 60 * 7 + 30),
      M('downtown', 'E005', 'Croissant delivery came in short again, I flagged it with the bakery.', 60 * 2 + 5),
      M('downtown', 'E014', 'Hi everyone! First full week done — thanks for all the help 😊', 50),

      M('riverside', 'E006', 'Patio heaters are on for the evening crew tonight 🔥', 60 * 5),
      M('riverside', 'E009', 'Soup of the day is butternut squash. Special board updated.', 60 * 3),
      M('riverside', 'E012', 'Can someone bring the extra sleeves from the storage room?', 44),
      M('riverside', 'E007', 'On it 👍', 40),
    ];
    // Direct messages
    const dm = (a, b) => ['dm', ...[a, b].sort()].join(':');
    data.messages.push(
      M(dm('E001', 'E002'), 'E001', 'Hey Maya — great job handling the rush this morning.', 60 * 30),
      M(dm('E001', 'E002'), 'E002', 'Thanks Alex! The new team is really coming together.', 60 * 29 + 40),
      M(dm('E001', 'E002'), 'E001', 'Agreed. I submitted the shift-lead training budget, should hear back next week.', 60 * 29),
      M(dm('E001', 'E002'), 'E002', 'Amazing 🙌 Also — I put in a time-off request for next month, no rush.', 60 * 2 + 10),
      M(dm('E001', 'E002'), 'E001', 'Saw it — I\'ll review it today 👍', 28),
      M(dm('E001', 'E006'), 'E006', 'Alex, the Riverside walk-in fridge is running warm. Called the technician.', 60 * 6),
      M(dm('E001', 'E006'), 'E001', 'Thanks Sofia. Keep me posted on the ETA.', 60 * 5 + 30),
      M(dm('E001', 'E013'), 'E013', 'Inventory count for Downtown is done and uploaded.', 60 * 20),
      M(dm('E001', 'E013'), 'E001', 'Perfect, thank you Diego 👌', 60 * 19),
      M(dm('E002', 'E003'), 'E003', 'Maya can you check my clock-out from Tuesday? I think I forgot to tap out.', 60 * 9),
      M(dm('E002', 'E003'), 'E002', 'I see it — you were auto-clocked out at 10:05pm, all good.', 60 * 8 + 30),
      M(dm('E002', 'E003'), 'E003', 'Phew, thanks! 🙏', 60 * 8),
      M(dm('E002', 'E004'), 'E004', 'Trading you my Sunday for your Wednesday? 🙏', 60 * 26),
      M(dm('E002', 'E004'), 'E002', 'Deal — I\'ll ask Alex to swap it in the schedule.', 60 * 25),
    );
    data.messages.sort((a, b) => a.at.localeCompare(b.at));

    /* ---- events log ---- */
    data.events = [
      { id: uid('ev'), type: 'schedule', text: 'Published next week\'s schedule', at: minsAgo(60 * 24 * 2), byId: 'E001' },
      { id: uid('ev'), type: 'hire', text: 'Zoe Nguyen joined as Barista · Downtown', at: minsAgo(60 * 24 * 9), byId: 'E001' },
      { id: uid('ev'), type: 'payroll', text: 'Payroll run completed · previous period', at: minsAgo(60 * 24 * 5), byId: 'E001' },
    ];
    return data;
  }

  /* ======================================================================
     ENTRY SIMULATION (deterministic per shift)
     - Every past shift gets a realistic entry (or a rare no-show)
     - Today's shifts that already started get an entry up to "now"
     ====================================================================== */
  function simulateEntries(data, current = now()) {
    const today = dateStr(current);
    const existing = new Set(data.timeEntries.map((e) => e.shiftId));
    data.shifts.forEach((shift) => {
      if (!shift.seeded || existing.has(shift.id)) return;
      if (shift.date > today) return;
      const r = rng(hash(shift.id + 'entry'));
      const start = at(shift.date, shift.start);
      const end = at(shift.date, shift.end);
      const isToday = shift.date === today;
      if (isToday && start > current) return; // not started yet
      const noShow = r() < 0.03 && !isToday;
      if (noShow) { data.timeEntries.push({ id: uid('te'), shiftId: shift.id, employeeId: shift.employeeId, date: shift.date, clockIn: null, clockOut: null, breakStart: null, breakEnd: null, noShow: true, seeded: true }); return; }
      const late = r() < 0.14;
      const inOffset = late ? 8 + Math.floor(r() * 22) : -7 + Math.floor(r() * 10);
      const clockIn = new Date(start.getTime() + inOffset * 60000);
      if (isToday && clockIn > current) return; // will clock in shortly
      const entry = { id: uid('te'), shiftId: shift.id, employeeId: shift.employeeId, date: shift.date, clockIn: clockIn.toISOString(), clockOut: null, breakStart: null, breakEnd: null, seeded: true };
      const mid = new Date((start.getTime() + end.getTime()) / 2 - 15 * 60000 + Math.floor(r() * 30) * 60000);
      const breakEnd = new Date(mid.getTime() + 30 * 60000);
      if (!isToday || mid <= current) entry.breakStart = mid.toISOString();
      if (!isToday || breakEnd <= current) entry.breakEnd = breakEnd.toISOString();
      const outOffset = -6 + Math.floor(r() * 18);
      const clockOut = new Date(end.getTime() + outOffset * 60000);
      if (!isToday || clockOut <= current) entry.clockOut = clockOut.toISOString();
      data.timeEntries.push(entry);
    });
  }

  /* ======================================================================
     LOAD / SAVE
     ====================================================================== */
  let data = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && parsed.seedDate === todayStr()) {
          data = parsed;
          simulateEntries(data); // advance the simulation to "now"
          save(false);
          return data;
        }
      }
    } catch (e) { /* fall through to reseed */ }
    data = seed();
    save(false);
    return data;
  }

  function save(emit = true) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
    if (emit) listeners.forEach((fn) => { try { fn('local'); } catch (err) { console.error(err); } });
  }

  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } data = seed(); save(); return data; }

  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { data = JSON.parse(e.newValue); } catch (err) { return; }
    listeners.forEach((fn) => { try { fn('remote'); } catch (err) { console.error(err); } });
  });

  /* ======================================================================
     QUERIES & COMMANDS
     ====================================================================== */
  const byId = (arr, id) => arr.find((x) => x.id === id) || null;

  const api = {
    get data() { return data; },
    KEY, uid, save, reset, onChange, load,
    // date utils
    dateStr, parseDate, addDays, diffDays, startOfWeek, weekDays, todayStr, now, at, toHM, hmToMin, rng, hash,

    /* ---- people ---- */
    employees(opts = {}) {
      let list = data.employees.slice();
      if (opts.active) list = list.filter((e) => e.status !== 'inactive');
      if (opts.locationId) list = list.filter((e) => e.locationId === opts.locationId);
      if (opts.positionId) list = list.filter((e) => e.positionId === opts.positionId);
      return list.sort((a, b) => a.name.localeCompare(b.name));
    },
    employee: (id) => byId(data.employees, id),
    position: (id) => byId(data.positions, id),
    location: (id) => byId(data.locations, id),
    manager: () => byId(data.employees, data.session.managerId),
    me: () => byId(data.employees, data.session.employeeId),
    addEmployee(payload) {
      const n = data.employees.length + 1;
      const id = `E${String(n).padStart(3, '0')}`;
      const emp = {
        id, first: payload.first, last: payload.last, name: `${payload.first} ${payload.last}`,
        email: payload.email || `${payload.first.toLowerCase()}.${payload.last.toLowerCase()}@lumen.coffee`,
        phone: payload.phone || '(415) 555-0199', positionId: payload.positionId, locationId: payload.locationId,
        rate: Number(payload.rate) || api.position(payload.positionId).rate, hiredAt: payload.hiredAt || todayStr(),
        pin: String(1000 + (hash(id) % 9000)), hue: hash(id) % 360, status: 'active', type: payload.type || 'Full-time',
        pattern: [0, 1, 2, 3, 4], shiftPref: ['mid'],
        balances: { vacation: { total: 15, used: 0 }, sick: { total: 8, used: 0 }, personal: { total: 4, used: 0 } },
      };
      data.employees.push(emp);
      api.log('hire', `${emp.name} joined as ${api.position(emp.positionId).name} · ${api.location(emp.locationId).name}`);
      save();
      return emp;
    },
    updateEmployee(id, patch) {
      const emp = api.employee(id); if (!emp) return null;
      Object.assign(emp, patch);
      if (patch.first || patch.last) emp.name = `${emp.first} ${emp.last}`;
      save();
      return emp;
    },

    /* ---- shifts ---- */
    shiftHours(s) { let m = hmToMin(s.end) - hmToMin(s.start); if (m < 0) m += 1440; return m / 60; },
    shiftsOn(date, opts = {}) {
      return data.shifts.filter((s) => s.date === date && (!opts.locationId || s.locationId === opts.locationId))
        .sort((a, b) => a.start.localeCompare(b.start) || a.employeeId.localeCompare(b.employeeId));
    },
    shiftsFor(empId, from, to) {
      return data.shifts.filter((s) => s.employeeId === empId && s.date >= from && s.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    },
    shiftsBetween(from, to) { return data.shifts.filter((s) => s.date >= from && s.date <= to); },
    shift: (id) => byId(data.shifts, id),
    addShift(payload) {
      const s = { id: uid('S'), published: false, ...payload };
      data.shifts.push(s); save(); return s;
    },
    updateShift(id, patch) { const s = api.shift(id); if (!s) return null; Object.assign(s, patch); save(); return s; },
    deleteShift(id) { data.shifts = data.shifts.filter((s) => s.id !== id); save(); },
    publishSchedule(weekStart) {
      const end = addDays(weekStart, 6);
      data.shifts.forEach((s) => { if (s.date >= weekStart && s.date <= end) s.published = true; });
      data.settings.schedulePublished = todayStr();
      api.log('schedule', `Published the schedule for the week of ${weekStart}`);
      save();
    },
    nextShift(empId, current = now()) {
      const today = dateStr(current);
      const list = api.shiftsFor(empId, today, addDays(today, 21));
      return list.find((s) => at(s.date, s.end) > current) || null;
    },

    /* ---- time entries ---- */
    entriesOn(date) { return data.timeEntries.filter((e) => e.date === date); },
    entriesFor(empId, from, to) { return data.timeEntries.filter((e) => e.employeeId === empId && e.date >= from && e.date <= to && !e.noShow).sort((a, b) => a.date.localeCompare(b.date)); },
    entryForShift(shiftId) { return data.timeEntries.find((e) => e.shiftId === shiftId) || null; },
    openEntry(empId) { return data.timeEntries.find((e) => e.employeeId === empId && e.clockIn && !e.clockOut) || null; },
    entryHours(e, current = now()) {
      if (!e || !e.clockIn) return 0;
      const inT = new Date(e.clockIn); const outT = e.clockOut ? new Date(e.clockOut) : current;
      let ms = outT - inT;
      if (e.breakStart) { const bs = new Date(e.breakStart); const be = e.breakEnd ? new Date(e.breakEnd) : (e.clockOut ? outT : current); ms -= Math.max(0, be - bs); }
      return Math.max(0, ms / 3600000);
    },
    entryState(e) {
      if (!e || !e.clockIn) return 'off';
      if (e.clockOut) return 'done';
      if (e.breakStart && !e.breakEnd) return 'break';
      return 'on';
    },
    hoursFor(empId, from, to) { return api.entriesFor(empId, from, to).reduce((sum, e) => sum + api.entryHours(e), 0); },
    onShiftNow() { return data.timeEntries.filter((e) => e.clockIn && !e.clockOut).map((e) => ({ entry: e, employee: api.employee(e.employeeId) })).filter((x) => x.employee); },

    clockIn(empId) {
      if (api.openEntry(empId)) return null;
      const today = todayStr();
      const shift = api.shiftsFor(empId, today, today).find((s) => !api.entryForShift(s.id)) || api.shiftsFor(empId, today, today)[0] || null;
      const e = { id: uid('te'), shiftId: shift && !api.entryForShift(shift.id) ? shift.id : null, employeeId: empId, date: today, clockIn: new Date().toISOString(), clockOut: null, breakStart: null, breakEnd: null, source: 'kiosk' };
      data.timeEntries.push(e);
      save();
      return e;
    },
    clockOut(empId) {
      const e = api.openEntry(empId); if (!e) return null;
      const nowIso = new Date().toISOString();
      if (e.breakStart && !e.breakEnd) e.breakEnd = nowIso;
      e.clockOut = nowIso;
      save();
      return e;
    },
    startBreak(empId) { const e = api.openEntry(empId); if (!e || e.breakStart) return null; e.breakStart = new Date().toISOString(); save(); return e; },
    endBreak(empId) { const e = api.openEntry(empId); if (!e || !e.breakStart || e.breakEnd) return null; e.breakEnd = new Date().toISOString(); save(); return e; },

    /* ---- time off ---- */
    timeOff(opts = {}) {
      let list = data.timeOff.slice();
      if (opts.status) list = list.filter((t) => t.status === opts.status);
      if (opts.employeeId) list = list.filter((t) => t.employeeId === opts.employeeId);
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    addTimeOff(payload) {
      const t = { id: uid('TO'), status: 'pending', createdAt: new Date().toISOString(), decidedBy: null, days: diffDays(payload.from, payload.to) + 1, ...payload };
      data.timeOff.push(t);
      api.log('timeoff', `${api.employee(t.employeeId).name} requested ${t.days} day${t.days > 1 ? 's' : ''} of ${t.type} leave`, { employeeId: t.employeeId });
      save();
      return t;
    },
    setTimeOffStatus(id, status, byId2) {
      const t = byId(data.timeOff, id); if (!t) return null;
      t.status = status; t.decidedBy = byId2 || data.session.managerId; t.decidedAt = new Date().toISOString();
      api.log('timeoff', `${status === 'approved' ? 'Approved' : 'Declined'} ${api.employee(t.employeeId).name}'s ${t.type} request`, { employeeId: t.employeeId });
      save();
      return t;
    },

    /* ---- chat ---- */
    dmId(a, b) { return ['dm', ...[a, b].sort()].join(':'); },
    channelsFor(viewerId) {
      const channels = data.channels.map((c) => ({ ...c }));
      const dms = {};
      data.messages.forEach((m) => {
        if (!m.channelId.startsWith('dm:')) return;
        const ids = m.channelId.split(':').slice(1);
        if (!ids.includes(viewerId)) return;
        const other = ids.find((x) => x !== viewerId);
        if (!dms[m.channelId]) dms[m.channelId] = { id: m.channelId, type: 'dm', otherId: other, name: (api.employee(other) || {}).name || 'Unknown' };
      });
      // ensure the demo pair always exists
      const pairId = api.dmId(data.session.managerId, data.session.employeeId);
      if (!dms[pairId] && [data.session.managerId, data.session.employeeId].includes(viewerId)) {
        const other = viewerId === data.session.managerId ? data.session.employeeId : data.session.managerId;
        dms[pairId] = { id: pairId, type: 'dm', otherId: other, name: api.employee(other).name };
      }
      return { channels, dms: Object.values(dms) };
    },
    messagesIn(channelId) { return data.messages.filter((m) => m.channelId === channelId).sort((a, b) => a.at.localeCompare(b.at)); },
    lastMessage(channelId) { const l = api.messagesIn(channelId); return l[l.length - 1] || null; },
    sendMessage(channelId, fromId, text) {
      const m = { id: uid('m'), channelId, fromId, text, at: new Date().toISOString() };
      data.messages.push(m); save(); return m;
    },
    markRead(viewerId, channelId) {
      data.reads = data.reads || {};
      data.reads[`${viewerId}:${channelId}`] = new Date().toISOString();
      save(false);
    },
    unreadCount(viewerId, channelId) {
      const since = (data.reads || {})[`${viewerId}:${channelId}`] || new Date(Date.now() - 3 * 3600000).toISOString();
      return api.messagesIn(channelId).filter((m) => m.at > since && m.fromId !== viewerId).length;
    },

    /* ---- payroll ---- */
    periods(count = 6) {
      const today = todayStr();
      const epoch = '2026-01-05'; // a Monday
      const weeks = Math.floor(diffDays(epoch, startOfWeek(today)) / 7);
      const currentStart = addDays(epoch, (weeks - (((weeks % 2) + 2) % 2)) * 7);
      const list = [];
      for (let i = 0; i < count; i++) {
        const start = addDays(currentStart, -14 * i);
        const end = addDays(start, 13);
        const payDate = addDays(end, 5);
        const run = data.payrollRuns[start];
        list.push({ start, end, payDate, current: i === 0, status: run ? 'paid' : (i === 0 ? 'open' : 'paid'), ranAt: run ? run.ranAt : null });
      }
      return list;
    },
    currentPeriod() { return api.periods(1)[0]; },
    employeePeriod(empId, period) {
      const emp = api.employee(empId);
      const entries = api.entriesFor(empId, period.start, period.end);
      // weekly overtime after 40h
      const weeks = { [period.start]: 0, [addDays(period.start, 7)]: 0 };
      entries.forEach((e) => { const w = startOfWeek(e.date); weeks[w] = (weeks[w] || 0) + api.entryHours(e); });
      let regular = 0, overtime = 0;
      Object.values(weeks).forEach((h) => { regular += Math.min(h, data.company.overtimeAfter); overtime += Math.max(0, h - data.company.overtimeAfter); });
      const gross = regular * emp.rate + overtime * emp.rate * 1.5;
      const taxes = gross * 0.212;
      return { employee: emp, entries, hours: regular + overtime, regular, overtime, rate: emp.rate, gross, taxes, net: gross - taxes, shifts: entries.length };
    },
    periodSummary(period) {
      const rows = api.employees({ active: true }).map((e) => api.employeePeriod(e.id, period)).filter((r) => r.hours > 0 || period.current);
      const total = rows.reduce((acc, r) => { acc.hours += r.hours; acc.regular += r.regular; acc.overtime += r.overtime; acc.gross += r.gross; acc.net += r.net; return acc; }, { hours: 0, regular: 0, overtime: 0, gross: 0, net: 0 });
      return { period, rows, total, employees: rows.filter((r) => r.hours > 0).length };
    },
    runPayroll(period) {
      data.payrollRuns[period.start] = { ranAt: new Date().toISOString(), byId: data.session.managerId };
      api.log('payroll', `Payroll run completed · ${period.start} → ${period.end}`);
      save();
    },

    /* ---- events / notifications ---- */
    log(type, text, meta = {}) { data.events.push({ id: uid('ev'), type, text, at: new Date().toISOString(), byId: data.session.managerId, ...meta }); if (data.events.length > 200) data.events.splice(0, data.events.length - 200); },
    activity(limit = 8) {
      const today = todayStr();
      const items = data.events.map((e) => ({ ...e }));
      data.timeEntries.filter((e) => e.date === today && e.clockIn).forEach((e) => {
        const emp = api.employee(e.employeeId); if (!emp) return;
        items.push({ id: e.id + ':in', type: 'clock', text: `${emp.name} clocked in`, at: e.clockIn, employeeId: emp.id });
        if (e.clockOut) items.push({ id: e.id + ':out', type: 'clock', text: `${emp.name} clocked out · ${api.entryHours(e).toFixed(1)}h`, at: e.clockOut, employeeId: emp.id });
      });
      data.timeOff.forEach((t) => { const emp = api.employee(t.employeeId); if (emp) items.push({ id: t.id, type: 'timeoff', text: `${emp.name} requested ${t.days} day${t.days > 1 ? 's' : ''} of ${t.type} leave`, at: t.createdAt, employeeId: emp.id }); });
      const seen = new Set();
      return items.filter((i) => { if (seen.has(i.text + i.at)) return false; seen.add(i.text + i.at); return true; })
        .sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    },
    notifications(viewerId) {
      const list = [];
      const isManager = viewerId === data.session.managerId;
      if (isManager) {
        api.timeOff({ status: 'pending' }).forEach((t) => list.push({ id: t.id, icon: 'calendar-outline', tone: 'amber', text: `<b>${api.employee(t.employeeId).name}</b> requested ${t.days} day${t.days > 1 ? 's' : ''} of ${t.type} leave`, at: t.createdAt, href: 'time-off.html' }));
        const today = todayStr();
        api.shiftsOn(today).forEach((s) => {
          const e = api.entryForShift(s.id); if (!e || !e.clockIn) return;
          const lateMin = Math.round((new Date(e.clockIn) - at(s.date, s.start)) / 60000);
          if (lateMin >= 8) list.push({ id: e.id, icon: 'time-outline', tone: 'red', text: `<b>${api.employee(s.employeeId).name}</b> clocked in ${lateMin} min late`, at: e.clockIn, href: 'attendance.html' });
        });
      } else {
        api.timeOff({ employeeId: viewerId }).filter((t) => t.status !== 'pending' && t.decidedAt).forEach((t) => list.push({ id: t.id, icon: t.status === 'approved' ? 'checkmark-circle-outline' : 'close-circle-outline', tone: t.status === 'approved' ? 'green' : 'red', text: `Your ${t.type} request was <b>${t.status}</b>`, at: t.decidedAt, href: 'time-off.html' }));
        const ns = api.nextShift(viewerId);
        if (ns) list.push({ id: ns.id, icon: 'briefcase-outline', tone: 'blue', text: `Next shift: <b>${ns.label}</b> ${ns.start}–${ns.end}`, at: new Date().toISOString(), href: 'schedule.html' });
      }
      const { channels, dms } = api.channelsFor(viewerId);
      [...channels, ...dms].forEach((c) => { const n = api.unreadCount(viewerId, c.id); if (n) list.push({ id: 'c' + c.id, icon: 'chatbubble-ellipses-outline', tone: 'violet', text: `<b>${n}</b> new message${n > 1 ? 's' : ''} in ${c.type === 'dm' ? c.name : '#' + c.name}`, at: api.lastMessage(c.id).at, href: 'messages.html?c=' + encodeURIComponent(c.id) }); });
      return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
    },

    /* ---- attendance helpers ---- */
    attendanceOn(date, current = now()) {
      const shifts = api.shiftsOn(date);
      return shifts.map((s) => {
        const emp = api.employee(s.employeeId);
        const dayEntries = data.timeEntries.filter((x) => x.employeeId === s.employeeId && x.date === date);
        const shiftEntry = dayEntries.find((x) => x.shiftId === s.id) || null;
        const open = dayEntries.find((x) => x.clockIn && !x.clockOut) || null;
        const e = open || shiftEntry || dayEntries[dayEntries.length - 1] || null;
        const first = dayEntries.filter((x) => x.clockIn).sort((a, b) => a.clockIn.localeCompare(b.clockIn))[0] || null;
        const start = at(s.date, s.start), end = at(s.date, s.end);
        let status = 'scheduled', lateMin = 0;
        if (e && e.noShow && !first) status = 'missed';
        else if (first) {
          lateMin = Math.max(0, Math.round((new Date(first.clockIn) - start) / 60000));
          status = open ? (open.breakStart && !open.breakEnd ? 'break' : 'on') : 'done';
        } else if (end < current) status = 'missed';
        else if (start < current && (current - start) / 60000 > 15) status = 'late';
        const hours = dayEntries.filter((x) => !x.noShow).reduce((sum, x) => sum + api.entryHours(x, current), 0);
        const lastOut = dayEntries.filter((x) => x.clockOut).map((x) => x.clockOut).sort().pop() || null;
        return { shift: s, employee: emp, entry: e, firstIn: first ? first.clockIn : null, lastOut, status, lateMin: lateMin >= 8 ? lateMin : 0, hours };
      }).filter((r) => r.employee);
    },
  };

  api.load();
  global.Store = api;
})(window);
