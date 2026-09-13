# Design — PostHub (Post Management System)

Live: [https://post-management-system-8abu.onrender.com/](https://post-management-system-8abu.onrender.com/)

---

## Architecture

Pattern: **MVC + Service Layer** on top of Express.

```
Request → Route → Controller → Service → Model → MongoDB
                      ↓
                   View (EJS)
```

- **Routes** — URL mapping + middleware chaining
- **Controllers** — thin HTTP layer; parse req, call service, send response
- **Services** — all business logic (auth, posts, sharing, collab)
- **Models** — Mongoose schemas
- **Views** — EJS server-rendered templates

---

## Models

### `user` (`models/user.js`)
| Field | Type | Description |
|---|---|---|
| `username` | String | Unique display handle |
| `name` | String | Full name |
| `age` | Number | User age |
| `email` | String | Login identifier |
| `password` | String | bcrypt hash |
| `posts` | [ObjectId → post] | Posts created by user |
| `sharedPosts` | [ObjectId → post] | Posts normally shared to this user |

### `post` (`models/post.js`)
| Field | Type | Description |
|---|---|---|
| `user` | ObjectId → user | Post owner |
| `date` | Date | Creation timestamp |
| `content` | String | Post body |
| `likes` | [ObjectId → user] | Users who liked |
| `collaborators` | [ObjectId → user] | Users with edit/delete access |
| `comments` | [subdocument] | Embedded comments array |

### Comment subdocument (inside `post.comments`)
| Field | Type | Description |
|---|---|---|
| `user` | ObjectId → user | Comment author |
| `content` | String | Comment body |
| `parent` | ObjectId (nullable) | Parent comment for threading |
| `likes` | [ObjectId → user] | Users who liked the comment |
| `date` | Date | Creation timestamp |

---

## Services

### `authService.js`
- `register({ email, password, username, name, age })` — checks duplicate, bcrypt hashes password, creates user, returns signed JWT
- `login({ email, password })` — finds user, compares password, returns JWT

### `postService.js`
- `getProfileByEmail(email)` — populates `posts`, `sharedPosts` (with nested user), and queries `collabPosts` separately
- `getAllPosts()` — all posts sorted by date desc, populated
- `createPost(email, content)` — creates post, pushes to user.posts
- `updatePostContent(id, content, userId)` — allows owner **or collaborator**
- `deletePost(id, userId)` — allows owner **or collaborator**
- `toggleLike(postId, userId)` — add/remove from likes array
- `addComment / deleteComment / editComment / toggleCommentLike` — comment CRUD with ownership checks and cascading delete
- `sharePost(postId, fromUserId, toUserId)` — pushes to recipient's `sharedPosts`; if already a collaborator, **downgrades** (removes from collaborators, adds to sharedPosts)
- `collabShare(postId, fromUserId, toUserId)` — adds toUserId to `post.collaborators`; if already in sharedPosts, **upgrades** (removes from sharedPosts)
- `getAllUsersExcept(currentUserId)` — returns all users for share modal

---

## Controllers

### `authController.js`
- `getLanding` → render `index.ejs`
- `getLogin` / `getSignup` → render auth pages
- `postRegister` → call `authService.register`, set JWT cookie, redirect `/profile`
- `postLogin` → call `authService.login`, set JWT cookie, redirect `/profile`
- `logout` → clear cookie, redirect `/login`

### `postController.js`
- `getProfile` → destructures `{ user, collabPosts }` from service, renders `profile.ejs` with `currentUserId`
- `getFeed` → renders `feed.ejs` with all posts + `currentUserId`
- `getUsers` → JSON response for share modal (`GET /api/users`)
- `sharePost` → calls `postService.sharePost`, returns JSON
- `collabShare` → calls `postService.collabShare`, returns JSON
- All other post/comment handlers delegate to `postService`

---

## Routes

### `authRoutes.js`
```
GET  /           → getLanding
GET  /login      → getLogin
POST /login      → postLogin
GET  /signup     → getSignup
POST /register   → postRegister  (express-validator: email, password length, age)
GET  /logout     → logout
```

### `postRoutes.js` (all behind `isLoggedIn`)
```
GET  /profile                              → getProfile
GET  /feed                                 → getFeed
POST /post                                 → postCreate
GET  /edit/:id                             → getEdit
POST /update/:id                           → postUpdate
POST /delete/:id                           → postDelete
GET  /like/:id                             → toggleLike
POST /comment/:id                          → postComment
POST /comment/:postId/delete/:commentId    → postDeleteComment
POST /comment/:postId/edit/:commentId      → postEditComment
GET  /comment/:postId/like/:commentId      → toggleCommentLike
GET  /api/users                            → getUsers
POST /share/:postId                        → sharePost
POST /collab-share/:postId                 → collabShare
```

---

## Middleware

### `middleware/auth.js` — `isLoggedIn`
- Reads `req.cookies.token`
- Verifies with `jwt.verify(token, process.env.JWT_SECRET)`
- Sets `req.user = { email, userid }` on success
- Redirects to `/` on failure

---

## Auth Flow

1. Register → bcrypt hash password → create user → sign JWT (`{ email, userid }`, 7d expiry) → httpOnly cookie
2. Login → find by email → bcrypt compare → sign JWT → httpOnly cookie
3. Every protected request → `isLoggedIn` verifies cookie → sets `req.user`
4. Logout → `res.clearCookie('token')`

Cookie options: `{ httpOnly: true, secure: true (prod), sameSite: 'lax' }`

---

## Share & Collab Share Flow

```
Owner clicks "Share" on post
  → POST /share/:postId { toUserId }
  → recipient.sharedPosts.push(postId)
  → shows on recipient's profile (read-only)

Owner clicks "Collab Share" on post
  → POST /collab-share/:postId { toUserId }
  → post.collaborators.push(toUserId)
  → shows on recipient's profile with edit/delete

Upgrade (share → collab):
  collabShare service removes postId from recipient.sharedPosts
  then adds toUserId to post.collaborators

Downgrade (collab → share):
  sharePost service removes toUserId from post.collaborators
  then adds postId to recipient.sharedPosts
```

---

## Security

| Measure | Status |
|---|---|
| Password hashing (bcrypt, 10 rounds) | ✅ |
| JWT in httpOnly cookie | ✅ |
| JWT secret from env variable | ✅ |
| Secure + SameSite cookie flags in prod | ✅ |
| Input validation on register (express-validator) | ✅ |
| Ownership checks on edit/delete | ✅ |
| Collaborator auth on edit/delete | ✅ |
| Rate limiting on auth routes | ✅ (express-rate-limit) |
| MongoDB injection prevention | ✅ (express-mongo-sanitize) |
| Security headers | ✅ (helmet) |

---

## Data Flow Examples

**Create post:**
`POST /post` → `postCreate` → `postService.createPost` → insert `post` doc → push `post._id` into `user.posts`

**Like post:**
`GET /like/:id` → `toggleLike` → add/remove userId from `post.likes` → redirect

**Nested comment:**
`POST /comment/:id` with `{ content, parent }` → `addComment` → push subdoc into `post.comments` with `parent` set

**Delete comment (cascade):**
`deleteComment` builds a Set of target + all descendant comment IDs, then filters them all out in one save

**Collab edit:**
`POST /update/:id` → `updatePostContent(id, content, userId)` → checks `post.user === userId || post.collaborators.includes(userId)`
