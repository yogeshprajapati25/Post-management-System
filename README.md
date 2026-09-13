# PostHub — Post Management System

A social-style post management web app built with Node.js, Express, EJS, and MongoDB.

🔗 **Live Demo:** [https://post-management-system-8abu.onrender.com/](https://post-management-system-8abu.onrender.com/)

---

## Features

- **Auth** — Register, login, logout with JWT (stored in httpOnly cookie, 7-day expiry)
- **Posts** — Create, edit, delete your own posts
- **Feed** — View all posts from all users, sorted by newest
- **Likes** — Like/unlike posts and comments
- **Comments** — Nested threaded comments with replies, edit/delete, likes
- **Share** — Share any of your posts with other users (view-only)
- **Collab Share** — Share with edit/delete access; upgrades/downgrades between share modes
- **Shared with You** — View posts others shared with you on your profile
- **Collab Posts** — View and edit posts you've been given collaborator access to

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Templating | EJS |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Styling | TailwindCSS (CDN) |

---

## Project Structure

```
app.js                  — Entry point, middleware, DB connection, route mounting
controllers/
  authController.js     — Login, register, logout handlers
  postController.js     — Post/comment/share/collab CRUD handlers
services/
  authService.js        — Auth business logic (register, login, JWT)
  postService.js        — Post/comment/share/collab business logic
models/
  user.js               — User schema (posts, sharedPosts)
  post.js               — Post schema (likes, comments, collaborators)
routes/
  authRoutes.js         — Auth routes with express-validator
  postRoutes.js         — Protected post/share/collab routes
middleware/
  auth.js               — isLoggedIn JWT middleware
views/
  index.ejs             — Landing page
  login.ejs             — Login form
  signup.ejs            — Signup form
  profile.ejs           — User profile, post creation, share/collab UI
  feed.ejs              — All posts feed with comments
  edit.ejs              — Edit post page
  partials/             — (nav, head, post-cards if present)
public/
  uploads/              — Uploaded post images
```

---

## Quick Start

**Prerequisites:** Node.js 14+, MongoDB URI (local or Atlas)

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, PORT

# Run
node app.js
```

Open: [https://post-management-system-8abu.onrender.com/](https://post-management-system-8abu.onrender.com/)

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `production` enables secure cookies |

---

## API / Routes

### Auth (`routes/authRoutes.js`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Landing page |
| GET | `/login` | Login page |
| POST | `/login` | Login handler |
| GET | `/signup` | Signup page |
| POST | `/register` | Register handler |
| GET | `/logout` | Logout |

### Posts (`routes/postRoutes.js`) — all protected
| Method | Path | Description |
|---|---|---|
| GET | `/profile` | User profile |
| GET | `/feed` | All posts feed |
| POST | `/post` | Create post |
| GET | `/edit/:id` | Edit page |
| POST | `/update/:id` | Update post content |
| POST | `/delete/:id` | Delete post |
| GET | `/like/:id` | Toggle like |
| POST | `/comment/:id` | Add comment/reply |
| POST | `/comment/:postId/delete/:commentId` | Delete comment |
| POST | `/comment/:postId/edit/:commentId` | Edit comment |
| GET | `/comment/:postId/like/:commentId` | Toggle comment like |
| GET | `/api/users` | Get all users (for share modal) |
| POST | `/share/:postId` | Normal share to a user |
| POST | `/collab-share/:postId` | Collab share (edit/delete access) |

---

## Share vs Collab Share

| | Normal Share | Collab Share |
|---|---|---|
| Visible on recipient's profile | ✅ | ✅ |
| Can edit | ❌ | ✅ |
| Can delete | ❌ | ✅ |
| Upgrade (share → collab) | — | Removes from sharedPosts, adds to collaborators |
| Downgrade (collab → share) | Removes collab, adds to sharedPosts | — |

---

## Design

See [Design.md](./Design.md) for full architecture details.
