const userModel = require("../models/user");
const postModel = require("../models/post");

async function getProfileByEmail(email) {
    let user = await userModel.findOne({ email: email }).populate("posts");
    return user;
}

async function getAllPosts() {
    let posts = await postModel.find({}).populate("user").populate('comments.user').sort({ date: -1 });
    return posts;
}

async function toggleLike(postId, userId) {
    let post = await postModel.findOne({ _id: postId }).populate("user");

    if (post.likes.indexOf(userId) === -1) {
        post.likes.push(userId);
    } else {
        post.likes.splice(post.likes.indexOf(userId), 1);
    }

    await post.save();
    return post;
}

async function getPostById(id) {
    return await postModel.findOne({ _id: id }).populate("user").populate('comments.user');
}

async function addComment(postId, userId, content) {
    let post = await postModel.findOne({ _id: postId });
    if (!post) throw new Error('POST_NOT_FOUND');

    post.comments.push({ user: userId, content });
    await post.save();
    return await post.populate('comments.user');
}

async function deleteComment(postId, commentId, requesterId) {
    let post = await postModel.findOne({ _id: postId }).populate('comments.user');
    if (!post) return { ok: false, reason: 'POST_NOT_FOUND' };

    const comment = post.comments.id(commentId);
    if (!comment) return { ok: false, reason: 'COMMENT_NOT_FOUND' };

    const isCommentOwner = comment.user && comment.user._id.toString() === requesterId.toString();
    const isPostOwner = post.user && post.user.toString() === requesterId.toString();

    if (!isCommentOwner && !isPostOwner) return { ok: false, reason: 'NOT_ALLOWED' };

    // Remove the comment by filtering the comments array (works whether subdoc methods are present or not)
    post.comments = post.comments.filter(c => c._id.toString() !== commentId.toString());
    await post.save();
    return { ok: true };
}

async function editComment(postId, commentId, requesterId, newContent) {
    let post = await postModel.findOne({ _id: postId }).populate('comments.user');
    if (!post) return { ok: false, reason: 'POST_NOT_FOUND' };

    const comment = post.comments.id(commentId);
    if (!comment) return { ok: false, reason: 'COMMENT_NOT_FOUND' };

    const isCommentOwner = comment.user && comment.user._id.toString() === requesterId.toString();
    if (!isCommentOwner) return { ok: false, reason: 'NOT_ALLOWED' };

    comment.content = newContent;
    await post.save();
    return { ok: true, comment };
}

async function updatePostContent(id, content) {
    return await postModel.findOneAndUpdate({ _id: id }, { content: content });
}

async function deletePost(id, userId) {
    let post = await postModel.findOne({ _id: id });
    if (!post) return { ok: false, reason: "NOT_FOUND" };
    if (post.user.toString() !== userId.toString()) return { ok: false, reason: "NOT_OWNER" };

    await postModel.findByIdAndDelete(id);
    let user = await userModel.findOne({ _id: post.user });
    user.posts = user.posts.filter(pid => pid.toString() !== id.toString());
    await user.save();
    return { ok: true };
}

async function createPost(userEmail, content) {
    let user = await userModel.findOne({ email: userEmail });
    let post = await postModel.create({ user: user._id, content });

    user.posts.push(post._id);
    await user.save();
    return post;
}

module.exports = {
    getProfileByEmail,
    getAllPosts,
    toggleLike,
    getPostById,
    updatePostContent,
    deletePost,
    createPost,
    addComment,
    deleteComment,
    editComment,
};
