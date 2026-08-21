# SwitchWala — Marketing Site

The public, unauthenticated site that sells the product — two pages,
both fully static and fully independent from `../frontend` (separate
`package.json`, separate Tailwind config, no shared dependencies, no
API calls). Meant to be deployed separately from the authenticated app
(a static host is enough — the build output in `dist/` is plain
HTML/CSS/JS, one file tree per page).

- `/` — the pitch: journey, features, metrics, roadmap
- `/contact/` — a lead-capture form that hands off to WhatsApp

## Develop

```bash
npm install
npm run dev        # http://localhost:3000 and http://localhost:3000/contact/
```

## Build

```bash
npm run build       # outputs to dist/ (dist/index.html + dist/contact/index.html)
npm run preview     # serve the production build on :3000
```

## Configuration

Every "Sign in" / "Get started" button currently routes to `/contact/`
— there's no live signup flow to send people to yet, so every CTA just
starts a conversation instead (see `src/components/SiteHeader.tsx`).

The contact form redirects to WhatsApp on submit, prefilled with the
form fields. The number is hardcoded as `WHATSAPP_NUMBER` at the top of
`src/ContactPage.tsx` — change it there if it ever needs to move.

## Content

Copy is sourced from [`FEATURES.md`](FEATURES.md) and [`plan.log`](plan.log)
in this same folder, and from `../sales/plan.md`. Screenshots live in
`public/landing/` (copied from `../sales/images/`).
