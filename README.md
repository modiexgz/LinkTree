# Lumin Bio - Premium Linktree Clone

A polished multi-tenant Linktree-style SaaS built with Node.js, Express, MongoDB/Mongoose, EJS, Tailwind CSS, and vanilla JavaScript.

## Run locally

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## MongoDB behavior

By default the app tries to connect to:

```text
mongodb://127.0.0.1:27017/premium_linktree
```

If MongoDB is not running locally, development mode automatically starts an embedded in-memory MongoDB so the app still boots. You will see a message like:

```text
MongoDB unavailable at mongodb://127.0.0.1:27017/premium_linktree. Starting embedded development MongoDB instead.
Embedded MongoDB running at mongodb://127.0.0.1:xxxxx/premium_linktree
```

The embedded database is temporary and resets when the server stops. For persistent data, install MongoDB locally or set `MONGODB_URI` in `.env`.

## Environment

Copy `.env.example` to `.env` if you want custom settings:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Key options:

```text
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/premium_linktree
SESSION_SECRET=replace-with-a-long-random-secret
DISABLE_MEMORY_MONGO=false
```

Set `DISABLE_MEMORY_MONGO=true` if you want startup to fail when MongoDB is unavailable.

## Scripts

```bash
npm start      # run the Express app
npm run dev    # run with nodemon
npm run check  # syntax check backend files
```
