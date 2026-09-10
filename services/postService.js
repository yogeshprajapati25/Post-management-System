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

async function addComment(postId, userId, content, parentId = null) {
    let post = await postModel.findOne({ _id: postId });
    if (!post) throw new Error('POST_NOT_FOUND');

    if (parentId) {
        const parent = post.comments.id(parentId);
        if (!parent) throw new Error('PARENT_NOT_FOUND');
    }

    post.comments.push({ user: userId, content, parent: parentId || null });
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

    // Collect this comment + all nested descendants, then remove
    const toRemove = new Set([commentId.toString()]);
    let changed = true;
    while (changed) {
        changed = false;
        post.comments.forEach(c => {
            if (c.parent && toRemove.has(c.parent.toString()) && !toRemove.has(c._id.toString())) {
                toRemove.add(c._id.toString());
                changed = true;
            }
        });
    }
    post.comments = post.comments.filter(c => !toRemove.has(c._id.toString()));
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

async function toggleCommentLike(postId, commentId, userId) {
    let post = await postModel.findOne({ _id: postId });
    if (!post) return { ok: false, reason: 'POST_NOT_FOUND' };

    const comment = post.comments.id(commentId);
    if (!comment) return { ok: false, reason: 'COMMENT_NOT_FOUND' };

    if (!comment.likes) comment.likes = [];
    if (!comment.dislikes) comment.dislikes = [];

    const likeIdx = comment.likes.findIndex(id => id.toString() === userId.toString());
    const dislikeIdx = comment.dislikes.findIndex(id => id.toString() === userId.toString());
    if (dislikeIdx !== -1) comment.dislikes.splice(dislikeIdx, 1);

    if (likeIdx === -1) comment.likes.push(userId);
    else comment.likes.splice(likeIdx, 1);

    await post.save();
    return { ok: true };
}

async function toggleCommentDislike(postId, commentId, userId) {
    let post = await postModel.findOne({ _id: postId });
    if (!post) return { ok: false, reason: 'POST_NOT_FOUND' };

    const comment = post.comments.id(commentId);
    if (!comment) return { ok: false, reason: 'COMMENT_NOT_FOUND' };

    if (!comment.likes) comment.likes = [];
    if (!comment.dislikes) comment.dislikes = [];

    const dislikeIdx = comment.dislikes.findIndex(id => id.toString() === userId.toString());
    const likeIdx = comment.likes.findIndex(id => id.toString() === userId.toString());
    if (likeIdx !== -1) comment.likes.splice(likeIdx, 1);

    if (dislikeIdx === -1) comment.dislikes.push(userId);
    else comment.dislikes.splice(dislikeIdx, 1);

    await post.save();
    return { ok: true };
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
    toggleCommentLike,
    toggleCommentDislike,
};
