# Design — Post-management-System

This document describes the current design and architecture of the codebase as provided (no code changes made).

## High-level architecture

- Pattern: Small Express MVC-style application.
- Presentation: EJS server-rendered views served from `views/`.
- Server: `app.js` sets view engine, body parsing, cookie parser, and mounts routes.
- Data: MongoDB via Mongoose models located in `models/`.
- Auth: JWT token stored in a cookie named `token`.

## Models

- `user` (`models/user.js`)
  - Fields: `username` (String), `name` (String), `age` (Number), `email` (String), `password` (String), `posts` (Array of ObjectId refs to `post`).
  - Note: This file also calls `mongoose.connect("mongodb://127.0.0.1:27017/miniproject")`.

- `post` (`models/post.js`)
  - Fields: `user` (ObjectId ref to `user`), `date` (Date, default now), `content` (String), `likes` (Array of ObjectId refs to `user`).

## Controllers (core responsibilities)

- `authController.js`
  - `getLanding` — render `index.ejs`.
  - `getLogin` — render `login.ejs` (accepts `exists` and `registered` query flags).
  - `getSignup` — render `signup.ejs`.
  - `postRegister` — check for existing user, hash password (`bcrypt`), create user, sign JWT and set cookie, redirect to `/profile`.
  - `postLogin` — find user by email, compare password with `bcrypt.compare`, sign JWT and set cookie on success.
  - `logout` — clear cookie and redirect to `/login`.

- `postController.js`
  - `getProfile` — load current user with populated `posts` and render `profile.ejs`.
  - `getFeed` — load all posts (populated with `user`), render `feed.ejs` and pass `currentUserId`.
  - `toggleLike` — add/remove current user's id from `post.likes` and redirect back to `feed` or `profile`.
  - `getEdit` — render edit page for a post.
  - `postUpdate` — update a post's `content`.
  - `postDelete` — check ownership, delete post, remove reference from user.posts.
  - `postCreate` — create a post, push id into user's `posts`.

## Routes

- `routes/authRoutes.js`
  - `/` GET → landing
  - `/login` GET → login page
  - `/login` POST → login handler
  - `/signup` GET → signup page
  - `/register` POST → register handler (express-validator used)
  - `/logout` GET → logout

- `routes/postRoutes.js` (all protected by `isLoggedIn` middleware)
  - `/profile` GET → profile
  - `/feed` GET → feed
  - `/like/:id` GET → toggle like
  - `/edit/:id` GET → edit page
  - `/update/:id` POST → update post
  - `/delete/:id` POST → delete post
  - `/post` POST → create post

## Middleware

- `middleware/auth.js` exposes `isLoggedIn` which reads `req.cookies.token` and verifies with `jwt.verify(token, "shhhh")`. If verification fails or token missing, request is redirected to `/`.

## Auth flow (current)

1. User registers via `/register`. Password is hashed using `bcrypt.hash` and a user document is created.
2. After successful registration (or login), a JWT token is signed with payload `{ email, userid }` and secret string `"shhhh"` and stored in a cookie named `token`.
3. Protected routes call `isLoggedIn` to decode the token and set `req.user` for downstream controllers.

## Typical data flows

- Create post: POST `/post` → `postController.postCreate` creates `post` doc and appends id to `user.posts`.
- Like post: GET `/like/:id` → `postController.toggleLike` adds/removes current user id in the `likes` array and saves.
- Delete post: POST `/delete/:id` → controller enforces owner check via `post.user.toString() !== req.user.userid.toString()` then deletes and removes ref from `user.posts`.

## Views

- `views/` contains EJS templates. Templates render server-side and rely on data objects (e.g., `user`, `posts`) passed from controllers.

## Security & operational observations

- Hardcoded secret (`"shhhh"`) and no token expiry reduces security.
- Cookies are written without `httpOnly`, `secure`, or `sameSite` — vulnerable to XSS/CSRF risks.
- DB connection in `models/user.js` makes startup ordering and error handling less explicit.
- No centralized error-handler middleware; controllers typically redirect on error.

## Extensibility & recommended follow-ups (no code changes made here)

- Move configuration to environment variables (use `dotenv`).
- Centralize DB connection in `app.js` or `config/db.js` and handle connection errors gracefully.
- Use a proper secret store or `.env` for JWT secret and add token expiry (e.g., `expiresIn: '1h'`).
- Set cookie options: `res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'lax' })`.
- Add input sanitization and consistent validation (confirm password check, better error messages).
- Add `start`/`dev` scripts and basic logging and error-handling middleware.

---
This design doc reflects the repository as currently implemented.
