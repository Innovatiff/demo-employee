# Crewline · Workforce management demo

A high-end, interactive demo of an employee management platform built as a **static multipage site** (no build step, no backend).
It ships three apps that share one live dataset in the browser:

| App | Path | Best on | What it shows |
|---|---|---|---|
| **Manager console** | `/manager/` | Desktop | Dashboard, employees, weekly schedule, live time & attendance, time-off approvals, payroll runs, team chat, settings |
| **Employee app** | `/employee/` | Mobile (shown in a phone frame on desktop) | Home, schedule, hours worked, pay & pay stubs, time-off requests, chat, profile & settings |
| **Clock-in kiosk** | `/kiosk/` | iPad | Greeting, clock and PIN pad; one big button to punch in or out |

The portal at `/` links to all three. Everything is seeded with realistic sample data for a fictional coffee company
(*Lumen Coffee Roasters*, 14 employees, 2 locations) and is generated **relative to today**, so schedules, timesheets and payroll always look current.

## Try the live story

1. Open the **kiosk** and enter a PIN (`1234` Maya · `2580` Jordan · the `?` in the corner lists them all). Punch in.
2. Open the **manager console → Time & Attendance** in another tab: the clock-in appears instantly (cross-tab live sync).
3. In the **employee app → Time off**, send a request. Approve it in **manager → Time off**; the app updates live.
4. Send a message from either app's **Messages**: it syncs across apps and teammates reply.

Demo data lives in `localStorage`, resets automatically each new day, and can be reset any time from
**Manager → Settings → Demo data** (or the avatar menu).

## Deploy to Netlify

The site is plain HTML/CSS/JS, so any of these work:

- **Connect the repo** in Netlify (recommended) — every push deploys automatically. `netlify.toml` already sets the publish directory to the repo root with no build command.
- **Drag & drop** the repository folder onto [app.netlify.com/drop](https://app.netlify.com/drop). A dropped site is a snapshot: re-upload it after each change.

Stylesheets and scripts are referenced with a `?v=` stamp so phones and browsers pick up a new deploy immediately.
After editing anything under `assets/`, run `node tools/bump-assets.js` before deploying.

## Project structure

```
index.html                 Demo portal
manager/*.html             Manager console (8 pages)
employee/*.html            Employee app (7 pages)
kiosk/index.html           Clock-in kiosk
assets/css/                tokens · components · shell · manager · employee · kiosk · landing · fonts
assets/js/store.js         Seeded demo data + localStorage persistence + cross-tab sync
assets/js/ui.js            Shared UI helpers: formatting, avatars, toasts, modals, menus, SVG charts
assets/js/chat.js          Chat module shared by the manager console and employee app
assets/js/pages/*.js       One script per page
assets/vendor/ionicons/    Ionicons 7 (self-hosted; only the icons used are vendored)
assets/fonts/              Inter + Plus Jakarta Sans (self-hosted, latin subset)
tools/vendor-icons.js      Re-vendors icons after you add new <ion-icon> names
tools/bump-assets.js       Cache-stamps CSS/JS references in the HTML (run after editing assets/)
```

## Development

Serve the folder with any static server, e.g. `python3 -m http.server 8080`, then open `http://localhost:8080/`.

Adding an icon: use any [Ionicons](https://ionic.io/ionicons) name, then run
`npm i ionicons@7.4.0 && node tools/vendor-icons.js` to copy the SVG into `assets/vendor/ionicons/svg`.
