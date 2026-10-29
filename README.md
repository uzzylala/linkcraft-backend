# LinkCraft

A URL shortener for creators and small marketers. Create short links with
custom slugs, edit destinations at any time, download QR codes, and see where
your clicks come from.

> This project is not currently hosted. See [Getting started](#getting-started)
> to run it locally, or [Deployment](#deployment) if you want to host it.

## Features

- Register and log in (JWT, bcrypt-hashed passwords)
- Short links with auto-generated or custom slugs, plus optional labels
- Edit a link's destination without changing the short URL
- Delete links, which also removes their click data
- QR code per link (PNG or SVG)
- Click analytics: clicks per day, top referring platforms, countries,
  devices, browsers and operating systems
- Paginated link list
- Rate limiting, input validation and security headers (Helmet)
- Each user can only see and modify their own links
- Data stored in PostgreSQL, so links and clicks survive restarts

## Tech stack

Node.js, Express 5, PostgreSQL (`pg`), JSON Web Tokens, bcryptjs, Helmet,
express-rate-limit, ua-parser-js, geoip-lite, qrcode.

## Getting started

### Prerequisites

- Node.js 20.11 or newer
- A PostgreSQL database, either local or hosted (for example on Neon)

### Install

```bash
git clone https://github.com/your-username/linkcraft-backend.git
cd linkcraft-backend
npm install
```

### Configure

Create a `.env` file in the project root:

```
PORT=3000
JWT_SECRET=use-a-long-random-string
DATABASE_URL=postgres://user:password@localhost:5432/linkcraft
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (defaults to 3000) |
| `JWT_SECRET` | Secret used to sign tokens. Use a long random string |
| `DATABASE_URL` | PostgreSQL connection string. Hosted providers such as Neon give you one that already includes `?sslmode=require` |
| `NODE_ENV` | Set to `production` when deployed (enables `trust proxy`) |

Never commit your `.env` file. It is listed in `.gitignore`.

### Create the database tables

```bash
npm run db:init
```

This runs `db/schema.sql` against your database and prints `Schema applied.`
It is safe to run more than once, because every statement uses
`IF NOT EXISTS`.

### Run

```bash
npm run dev     # development, restarts on save
npm start       # production
```

## API

Send the token as `Authorization: Bearer <token>` on routes marked "yes".

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | no | Create an account, returns a token |
| POST | `/api/auth/login` | no | Log in, returns a token |
| POST | `/api/links` | yes | Create a link (`url`, optional `slug`, `label`) |
| GET | `/api/links` | yes | List your links with click counts (`?page=1&limit=10`, max 50) |
| PUT | `/api/links/:code` | yes | Update `url` and/or `label` |
| DELETE | `/api/links/:code` | yes | Delete a link and its click data |
| GET | `/api/links/:code/stats` | yes | Click analytics |
| GET | `/api/links/:code/qr` | yes | QR code (`?format=svg` for SVG) |
| GET | `/:code` | no | Redirect to the destination and record the click |

### Example requests

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{ "email": "you@example.com", "password": "at-least-8-chars" }
```

Response:

```json
{ "token": "eyJhbGciOi..." }
```

#### Create a link

```http
POST /api/links
Authorization: Bearer <token>
Content-Type: application/json

{ "url": "https://example.com", "slug": "my-link", "label": "Launch page" }
```

Response (`201 Created`):

```json
{
  "id": 1,
  "userId": 1,
  "code": "my-link",
  "originalUrl": "https://example.com",
  "label": "Launch page",
  "createdAt": "2026-10-29T11:22:00.000Z",
  "shortUrl": "http://localhost:3000/my-link"
}
```

#### List links

```http
GET /api/links?page=1&limit=10
Authorization: Bearer <token>
```

Response:

```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "code": "my-link",
      "originalUrl": "https://example.com",
      "label": "Launch page",
      "createdAt": "2026-10-29T11:22:00.000Z",
      "totalClicks": 3,
      "shortUrl": "http://localhost:3000/my-link"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Get stats

```http
GET /api/links/my-link/stats
Authorization: Bearer <token>
```

Response:

```json
{
  "code": "my-link",
  "originalUrl": "https://example.com",
  "label": "Launch page",
  "totalClicks": 3,
  "clicksPerDay": [{ "date": "2026-10-29", "clicks": 3 }],
  "topPlatforms": [{ "name": "direct", "clicks": 3 }],
  "topCountries": [{ "name": "NG", "clicks": 3 }],
  "devices": [{ "name": "desktop", "clicks": 3 }],
  "browsers": [{ "name": "Chrome", "clicks": 3 }],
  "operatingSystems": [{ "name": "Windows", "clicks": 3 }]
}
```

To attribute a campaign accurately, add `?src=` to the short link, for example
`http://localhost:3000/my-link?src=newsletter`.

#### Delete a link

```http
DELETE /api/links/my-link
Authorization: Bearer <token>
```

Response:

```json
{ "message": "Link deleted." }
```

### Errors

Errors are returned as JSON in the form `{ "error": "message" }`.

| Status | Meaning |
|---|---|
| 400 | Invalid input (bad URL, slug or label) |
| 401 | Missing, invalid or expired token, or wrong credentials |
| 404 | Link not found (or it belongs to another user) |
| 409 | Email already in use, or slug unavailable |
| 429 | Rate limit reached |

## Project structure

```
linkcraft-backend/
├── db/
│   ├── init.js            # Applies schema.sql to the database
│   └── schema.sql         # users, links and clicks tables
├── middleware/
│   ├── authenticate.js    # Verifies the JWT on protected routes
│   └── rateLimiters.js    # Per-route rate limits
├── routes/
│   ├── auth.js            # Register and login
│   ├── links.js           # Create, list, update, delete, stats, QR
│   └── redirect.js        # Public redirect and click tracking
├── utils/
│   ├── analytics.js       # Bot filtering, platform, device and country detection
│   ├── code.js            # Random short-code generator
│   ├── db.js              # All database queries
│   └── stats.js           # Aggregates clicks into analytics
└── index.js               # App setup and route mounting
```

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
- **Country comes from an offline GeoIP lookup.** IP addresses are used only
  for the lookup and are never stored, which keeps visitor data minimal. The
  trade-off is that unique visitors cannot be counted, only clicks.
- **Bots are filtered out** of analytics using the User-Agent header.
- **Slugs are restricted** to letters, digits, `-` and `_`, and reserved words
  are blocked so they cannot clash with API routes.
- **Rate limits differ per route:** strict for login, per-user for link
  creation, generous for public redirects.
- **Pagination is capped.** The links list defaults to 10 per page and allows
  at most 50, and results are ordered so links never repeat or go missing
  between pages.
- **All storage is in `utils/db.js`,** so changing databases does not touch the
  routes. It maps database column names (`snake_case`) to the camelCase
  fields the rest of the code uses.
- **Indexes match the queries.** Links are indexed by owner and clicks by
  link and time, so listing links and building stats stay fast as data grows.
- **Deleting a user or link cascades** to their links and clicks, so no
  orphaned rows are left behind.

## Deployment

The app runs as a standard Node.js server, so it fits hosts that run
long-lived processes, such as Render.

1. Create a hosted PostgreSQL database (for example on Neon) and copy its
   connection string.
2. Push the code to GitHub and create a Web Service on your host.
3. Set the environment variables: `DATABASE_URL`, `JWT_SECRET` and
   `NODE_ENV=production`.
4. Set the build command to `npm install` and the start command to
   `npm start`.
5. Run `npm run db:init` once against the hosted database to create the tables.
6. Visit the live URL and run through the register, create link, redirect
   and stats flow.

If your database provider rejects the connection with an SSL error, add
`ssl: { rejectUnauthorized: false }` to the `pg.Pool` options in
`utils/db.js`.

Note: free hosting tiers often put idle services to sleep, so the first
request after a quiet period can be slow.

## Roadmap

- [x] Migrate from in-memory storage to PostgreSQL
- [x] Delete links
- [x] Visitor country analytics (GeoIP)
- [x] Pagination on the links list

Possible next steps: link expiry dates and click limits, automated tests
(Jest and Supertest), and a dashboard frontend.

## Author

Uzezi Onogomuho