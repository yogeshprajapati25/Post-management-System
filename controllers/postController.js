const postService = require("../services/postService");

// Show current user's profile and posts
async function getProfile(req, res) {
    const { user, collabPosts } = await postService.getProfileByEmail(req.user.email);
    res.render("profile", { user, collabPosts, currentUserId: req.user.userid });
}

// Show all posts from all users
async function getFeed(req, res) {
    let posts = await postService.getAllPosts();
    res.render("feed", { posts, currentUserId: req.user.userid });
}

// Add a comment to a post (or reply if parent is set)
async function postComment(req, res) {
    const postId = req.params.id;
    const content = req.body.content;
    const parent = req.body.parent || null;
    try {
        await postService.addComment(postId, req.user.userid, content, parent);
    } catch (err) {
        // ignore for now
    }
    res.redirect('/feed');
}

// Delete a comment (allowed for comment owner or post owner)
async function postDeleteComment(req, res) {
    const { postId, commentId } = req.params;
    await postService.deleteComment(postId, commentId, req.user.userid);
    res.redirect('/feed');
}

// Edit a comment (only comment owner)
async function postEditComment(req, res) {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    await postService.editComment(postId, commentId, req.user.userid, content);
    res.redirect('/feed');
}

// Like / unlike a comment
async function toggleCommentLike(req, res) {
    const { postId, commentId } = req.params;
    await postService.toggleCommentLike(postId, commentId, req.user.userid);
    res.redirect('/feed');
}

// Like / unlike a post
async function toggleLike(req, res) {
    await postService.toggleLike(req.params.id, req.user.userid);
    if (req.query.from === "feed") res.redirect("/feed");
    else res.redirect("/profile");
}

async function toggleDislike(req, res) {
    await postService.toggleDislike(req.params.id, req.user.userid);
    if (req.query.from === "feed") res.redirect("/feed");
    else res.redirect("/profile");
}

// Show edit page for a post
async function getEdit(req, res) {
    let post = await postService.getPostById(req.params.id);
    res.render("edit", { post });
}

// Update a post's content
async function postUpdate(req, res) {
    await postService.updatePostContent(req.params.id, req.body.content, req.user.userid);
    res.redirect("/profile");
}

// Delete a post
async function postDelete(req, res) {
    const result = await postService.deletePost(req.params.id, req.user.userid);
    return res.redirect("/profile");
}

// Create a new post
async function postCreate(req, res) {
    let { content } = req.body;
    await postService.createPost(req.user.email, content);
    res.redirect("/profile");
}

// GET /api/users — returns all users except self (for share modal)
async function getUsers(req, res) {
    const users = await postService.getAllUsersExcept(req.user.userid);
    res.json(users);
}

// POST /share/:postId — share a post with a user
async function sharePost(req, res) {
    const result = await postService.sharePost(
        req.params.postId,
        req.user.userid,
        req.body.toUserId
    );
    res.json(result);
}

// POST /collab-share/:postId — collab share a post
async function collabShare(req, res) {
    const result = await postService.collabShare(
        req.params.postId,
        req.user.userid,
        req.body.toUserId
    );
    res.json(result);
}

module.exports = {
    getProfile,
    getFeed,
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
    getUsers,
    sharePost,
    collabShare,
};

