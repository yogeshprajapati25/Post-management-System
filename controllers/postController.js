const path = require('path');
const multer = require('multer');
const postService = require("../services/postService");

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../public/uploads'),
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '-' + safe);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/^image\//.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only images allowed'));
    }
});

function wantsJson(req) {
    return req.query.ajax === '1' || (req.headers.accept || '').includes('application/json');
}

async function getProfile(req, res) {
    const user = await postService.getProfileByEmail(req.user.email);
    res.render("profile", { user, me: user, currentUserId: req.user.userid, activePage: 'profile' });
}

async function getFeed(req, res) {
    const me = await postService.getProfileByEmail(req.user.email);
    const { posts, hasMore, nextCursor } = await postService.getAllPosts(postService.PAGE_SIZE);
    res.render("feed", {
        posts,
        hasMore,
        nextCursor,
        me,
        currentUserId: req.user.userid,
        activePage: 'feed'
    });
}

async function getMorePosts(req, res) {
    const before = req.query.before || null;
    const { posts, hasMore, nextCursor } = await postService.getAllPosts(postService.PAGE_SIZE, before);
    res.render("partials/post-cards", {
        posts,
        currentUserId: req.user.userid,
        layout: false
    }, (err, html) => {
        if (err) return res.status(500).json({ ok: false });
        res.json({ ok: true, html, hasMore, nextCursor });
    });
}

async function postComment(req, res) {
    const postId = req.params.id;
    const content = req.body.content;
    const parent = req.body.parent || null;
    try {
        const comment = await postService.addComment(postId, req.user.userid, content, parent);
        if (wantsJson(req)) {
            return res.json({
                ok: true,
                comment: {
                    _id: comment._id,
                    content: comment.content,
                    parent: comment.parent,
                    date: comment.date,
                    user: comment.user,
                    likes: [],
                    dislikes: []
                }
            });
        }
    } catch (err) {
        if (wantsJson(req)) return res.status(400).json({ ok: false, error: err.message });
    }
    res.redirect('/feed');
}

async function postDeleteComment(req, res) {
    const { postId, commentId } = req.params;
    const result = await postService.deleteComment(postId, commentId, req.user.userid);
    if (wantsJson(req)) return res.json(result);
    res.redirect('/feed');
}

async function postEditComment(req, res) {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const result = await postService.editComment(postId, commentId, req.user.userid, content);
    if (wantsJson(req)) return res.json(result);
    res.redirect('/feed');
}

async function toggleCommentLike(req, res) {
    const { postId, commentId } = req.params;
    const state = await postService.toggleCommentLike(postId, commentId, req.user.userid);
    if (!state) {
        if (wantsJson(req)) return res.status(404).json({ ok: false });
        return res.redirect('/feed');
    }
    if (wantsJson(req)) return res.json({ ok: true, ...state });
    res.redirect('/feed');
}

async function toggleCommentDislike(req, res) {
    const { postId, commentId } = req.params;
    const state = await postService.toggleCommentDislike(postId, commentId, req.user.userid);
    if (!state) {
        if (wantsJson(req)) return res.status(404).json({ ok: false });
        return res.redirect('/feed');
    }
    if (wantsJson(req)) return res.json({ ok: true, ...state });
    res.redirect('/feed');
}

async function toggleLike(req, res) {
    const state = await postService.toggleLike(req.params.id, req.user.userid);
    if (wantsJson(req)) return res.json({ ok: !!state, ...state });
    if (req.query.from === "feed") res.redirect("/feed");
    else res.redirect("/profile");
}

async function toggleDislike(req, res) {
    const state = await postService.toggleDislike(req.params.id, req.user.userid);
    if (wantsJson(req)) return res.json({ ok: !!state, ...state });
    if (req.query.from === "feed") res.redirect("/feed");
    else res.redirect("/profile");
}

async function getEdit(req, res) {
    const post = await postService.getPostById(req.params.id);
    res.render("edit", { post, activePage: 'profile', currentUserId: req.user.userid });
}

async function postUpdate(req, res) {
    await postService.updatePostContent(req.params.id, req.body.content);
    res.redirect("/profile");
}

async function postDelete(req, res) {
    await postService.deletePost(req.params.id, req.user.userid);
    return res.redirect("/profile");
}

async function postCreate(req, res) {
    const content = req.body.content;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    await postService.createPost(req.user.email, content, image);
    res.redirect("/profile");
}

module.exports = {
    upload,
    getProfile,
    getFeed,
    getMorePosts,
    toggleLike,
    toggleDislike,
    getEdit,
    postUpdate,
    postDelete,
    postCreate,
    postComment,
    postDeleteComment,
    postEditComment,
    toggleCommentLike,
    toggleCommentDislike,
};
