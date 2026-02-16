const postService = require("../services/postService");

// Show current user's profile and posts
async function getProfile(req, res) {
    let user = await postService.getProfileByEmail(req.user.email);
    res.render("profile", { user });
}

// Show all posts from all users
async function getFeed(req, res) {
    let posts = await postService.getAllPosts();
    res.render("feed", { posts, currentUserId: req.user.userid });
}

// Like / unlike a post
async function toggleLike(req, res) {
    await postService.toggleLike(req.params.id, req.user.userid);
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
    await postService.updatePostContent(req.params.id, req.body.content);
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

module.exports = {
    getProfile,
    getFeed,
    toggleLike,
    getEdit,
    postUpdate,
    postDelete,
    postCreate,
};

