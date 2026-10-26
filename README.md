# LinkCraft

A URL shortener for creators and small marketers. Create short links with
custom slugs, edit destinations at any time, download QR codes, and see where
your clicks come from.

**Live demo:** [add URL after deploying]

## Features

- Register and log in (JWT, bcrypt-hashed passwords)
- Short links with auto-generated or custom slugs, plus optional labels
- Edit a link's destination without changing the short URL
- QR code per link (PNG or SVG)
- Click analytics: clicks per day, top referring platforms, devices,
  browsers and operating systems
- Rate limiting, input validation and security headers (Helmet)
- Each user can only see and modify their own links

## Tech stack

Node.js, Express 5, JSON Web Tokens, bcryptjs, Helmet, express-rate-limit,
ua-parser-js, qrcode. Storage is currently in memory (see Roadmap).

## Getting started

```bash
git clone [your repo url]
cd linkcraft-backend
npm install
```

Create a `.env` file:

```
PORT=3000
JWT_SECRET=use-a-long-random-string
```

```bash
npm run dev     # development, restarts on save
npm start       # production
```

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | no | Create an account, returns a token |
| POST | `/api/auth/login` | no | Log in, returns a token |
| POST | `/api/links` | yes | Create a link (`url`, optional `slug`, `label`) |
| GET | `/api/links` | yes | List your links with click counts |
| PUT | `/api/links/:code` | yes | Update `url` and/or `label` |
| GET | `/api/links/:code/stats` | yes | Click analytics |
| GET | `/api/links/:code/qr` | yes | QR code (`?format=svg` for SVG) |
| GET | `/:code` | no | Redirect to the destination and record the click |

Send the token as `Authorization: Bearer <token>`.

## Design decisions

- **302 instead of 301 redirects.** Browsers cache a 301, which would skip the
  server, so clicks would go uncounted and edited destinations would not take
  effect for returning visitors.
- **QR codes encode the short URL.** A printed QR keeps working after the
  destination is edited, and scans are counted.
- **Other users' links return 404, not 403,** so codes cannot be enumerated.
- **Referrer data is unreliable.** In-app browsers and privacy settings strip
  the `Referer` header, so some clicks show as "direct". A `?src=newsletter`
  parameter on the short link overrides it for campaigns that need accuracy.
- **Bots are filtered out** of analytics using the User-Agent header.
- **Slugs are restricted** to letters, digits, `-` and `_`, and reserved words
  are blocked so they cannot clash with API routes.
- **Rate limits differ per route:** strict for login, per-user for link
  creation, generous for public redirects.
- **All storage is in `utils/db.js`,** so changing databases does not touch the
  routes.

## Roadmap

- [ ] Migrate from in-memory storage to PostgreSQL
- [ ] Visitor country analytics (GeoIP)
- [ ] Link expiry dates and click limits
- [ ] Dashboard frontend
- [ ] Automated tests (Jest and Supertest)

## Deliberately out of scope

Teams and workspaces, billing, and custom domains.