# Blueprint AI - Frontend

Static vanilla HTML/CSS/JS frontend for Blueprint.

## Pages
- `login.html` (auth)
- `index.html` (chat + conversations + study guide library)
- `canvas.html` (Canvas link + dashboard)

## Hosting (Cloudflare Pages)
This repo is intended to be deployed on Cloudflare Pages as a static site.

Suggested settings:
- Production branch: `main`
- Framework preset: `None`
- Build command: (leave blank, or use `exit 0` if required)
- Build output directory: `.` (repo root)

After first deploy, Cloudflare will give you a `*.pages.dev` URL. You can later attach a custom domain in the Cloudflare dashboard.
