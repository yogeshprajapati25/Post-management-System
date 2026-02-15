# Post-management-System

Simple post-management web app (Express + EJS + MongoDB). 

## Overview

- Purpose: small social-style application that supports user signup/login, creating posts, liking posts, editing and deleting posts.
- Stack: Node.js, Express, EJS, MongoDB (Mongoose), JWT for auth, bcrypt for password hashing.

## Quick start (current codebase, no changes)

Prerequisites:

- Node.js (14+)
- MongoDB running locally. The code currently expects MongoDB at `mongodb://127.0.0.1:27017/miniproject` (see `models/user.js`).

Install dependencies:

```bash
npm install
```

Run the app:

```bash
node app.js
```

Open in the browser: http://localhost:3000

Notes about current (unchanged) defaults in code:

- App listens on port `3000` (hardcoded in `app.js`).
- JWT secret is hardcoded as `"shhhh"` in `controllers/authController.js` and `middleware/auth.js`.
- MongoDB connection is established inside `models/user.js`.
- There is no `start` script in `package.json` (use `node app.js`).

## Project structure

- `app.js` — application entry point and route mounting.
- `package.json` — dependency list.
- `controllers/` — `authController.js`, `postController.js` (business logic).
- `models/` — `user.js`, `post.js` (Mongoose schemas). Note: `mongoose.connect(...)` runs in `models/user.js`.
- `routes/` — `authRoutes.js`, `postRoutes.js` (route definitions, validation middleware used in auth routes).
- `middleware/` — `auth.js` (`isLoggedIn` JWT-check middleware).
- `views/` — EJS templates: `index.ejs`, `login.ejs`, `signup.ejs`, `profile.ejs`, `feed.ejs`, `edit.ejs`.

## Known caveats (observed from current code)

- JWT secret hardcoded and no token expiry configured.
- Cookies are set without `httpOnly`, `secure`, or `sameSite` flags.
- MongoDB connection is placed inside a model file rather than centralized in `app.js` or `config/`.
- `package.json` lacks `start` and `dev` scripts.
- `multer` is listed in dependencies but not used by the current code.

## Where to look

- Authentication: `controllers/authController.js`, `routes/authRoutes.js`, `middleware/auth.js`.
- Posts: `controllers/postController.js`, `routes/postRoutes.js`, `models/post.js`.
- Views: `views/` directory (EJS templates).

## Suggested next steps (optional)

(These are suggestions only — no changes made by this doc.)

- Move DB connect to `app.js` or `config/db.js` and use `dotenv` for configuration.
- Replace hardcoded JWT secret with `process.env.JWT_SECRET` and add token expiry.
- Set cookie flags (`httpOnly`, `secure`, `sameSite`) when writing cookies.
- Add `start`/`dev` scripts and minimal logging and error-handling middleware.

---
Generated documentation reflects the repository in its current state.
