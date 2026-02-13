const userModel = require("../models/user");
const postModel = require("../models/post");

// Show current user's profile and posts
async function getProfile(req, res) {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    res.render("profile", { user });
}

// Show all posts from all users
async function getFeed(req, res) {
    let posts = await postModel.find({}).populate("user").sort({ date: -1 });
    res.render("feed", { posts, currentUserId: req.user.userid });
}

// Like / unlike a post
async function toggleLike(req, res) {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid);
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    if (req.query.from === "feed") res.redirect("/feed");
    else res.redirect("/profile");
}

// Show edit page for a post
async function getEdit(req, res) {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");
    res.render("edit", { post });
}

// Update a post's content
async function postUpdate(req, res) {
    await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content });
    res.redirect("/profile");
}

// Delete a post
async function postDelete(req, res) {
    let post = await postModel.findOne({ _id: req.params.id });
    if (!post) return res.redirect("/profile");
    if (post.user.toString() !== req.user.userid.toString()) return res.redirect("/profile");

    await postModel.findByIdAndDelete(req.params.id);
    let user = await userModel.findOne({ email: req.user.email });
    user.posts = user.posts.filter(id => id.toString() !== req.params.id);
    await user.save();
    res.redirect("/profile");
}

// Create a new post
async function postCreate(req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;

    let post = await postModel.create({
        user: user._id,
        content
    });

    user.posts.push(post._id);
    await user.save();
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

