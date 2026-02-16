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



## Where to look

- Authentication: `controllers/authController.js`, `routes/authRoutes.js`, `middleware/auth.js`.
- Posts: `controllers/postController.js`, `routes/postRoutes.js`, `models/post.js`.
- Views: `views/` directory (EJS templates).




## Design (brief)

This project follows a small Express MVC pattern with server-rendered EJS views. Core pieces:

- Models: Mongoose schemas in `models/` (`user`, `post`).
- Controllers: handle HTTP requests and responses (located in `controllers/`).
- Routes: map URLs to controller actions (`routes/`).
- Middleware: auth middleware in `middleware/auth.js` protects routes using JWT in a cookie.

I refactored controller logic into thin endpoints that call service modules in `services/` (new). Services encapsulate the core business logic (user creation/login, post creation/manipulation). This separation improves testability and keeps controllers focused on HTTP concerns.

See `Design.md` for the original design document.




