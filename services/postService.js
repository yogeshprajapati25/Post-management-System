const userModel = require("../models/user");
const postModel = require("../models/post");

const PAGE_SIZE = 10;

function reactionState(doc, userId) {
    const likes = doc.likes || [];
    const dislikes = doc.dislikes || [];
    const uid = userId.toString();
    return {
        likes: likes.length,
        dislikes: dislikes.length,
        liked: likes.some(id => id.toString() === uid),
        disliked: dislikes.some(id => id.toString() === uid),
    };
}

function toggleReaction(likes, dislikes, userId, type) {
    if (!likes) likes = [];
    if (!dislikes) dislikes = [];
    const uid = userId.toString();
    const likeIdx = likes.findIndex(id => id.toString() === uid);
    const dislikeIdx = dislikes.findIndex(id => id.toString() === uid);

    if (type === 'like') {
        if (dislikeIdx !== -1) dislikes.splice(dislikeIdx, 1);
        if (likeIdx === -1) likes.push(userId);
        else likes.splice(likeIdx, 1);
    } else {
        if (likeIdx !== -1) likes.splice(likeIdx, 1);
        if (dislikeIdx === -1) dislikes.push(userId);
        else dislikes.splice(dislikeIdx, 1);
    }
    return { likes, dislikes };
}

async function getProfileByEmail(email) {
    return await userModel.findOne({ email }).populate("posts");
}

async function getAllPosts(limit = PAGE_SIZE, before = null) {
    const query = before ? { date: { $lt: new Date(before) } } : {};
    const posts = await postModel.find(query)
        .populate("user")
        .populate('comments.user')
        .sort({ date: -1 })
        .limit(limit + 1);

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && items.length ? items[items.length - 1].date.toISOString() : null;
    return { posts: items, hasMore, nextCursor };
}

async function toggleLike(postId, userId) {
    const post = await postModel.findById(postId);
    if (!post) return null;
    if (!post.dislikes) post.dislikes = [];
    const r = toggleReaction(post.likes, post.dislikes, userId, 'like');
    post.likes = r.likes;
    post.dislikes = r.dislikes;
    await post.save();
    return reactionState(post, userId);
}

async function toggleDislike(postId, userId) {
    const post = await postModel.findById(postId);
    if (!post) return null;
    if (!post.dislikes) post.dislikes = [];
    const r = toggleReaction(post.likes, post.dislikes, userId, 'dislike');
    post.likes = r.likes;
    post.dislikes = r.dislikes;
    await post.save();
    return reactionState(post, userId);
}

async function getPostById(id) {
    return await postModel.findById(id).populate("user").populate('comments.user');
}

async function addComment(postId, userId, content, parentId = null) {
    const post = await postModel.findById(postId);
    if (!post) throw new Error('POST_NOT_FOUND');

    if (parentId) {
        const parent = post.comments.id(parentId);
        if (!parent) throw new Error('PARENT_NOT_FOUND');
    }

    post.comments.push({
        user: userId,
        content,
        parent: parentId || null,
        likes: [],
        dislikes: []
    });
    await post.save();
    await post.populate('comments.user');
    const created = post.comments[post.comments.length - 1];
    return created;
}

async function deleteComment(postId, commentId, requesterId) {
    const post = await postModel.findById(postId).populate('comments.user');
    if (!post) return { ok: false, reason: 'POST_NOT_FOUND' };

    const comment = post.comments.id(commentId);
    if (!comment) return { ok: false, reason: 'COMMENT_NOT_FOUND' };

    const isCommentOwner = comment.user && comment.user._id.toString() === requesterId.toString();
    const isPostOwner = post.user && post.user.toString() === requesterId.toString();
    if (!isCommentOwner && !isPostOwner) return { ok: false, reason: 'NOT_ALLOWED' };

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
    const post = await postModel.findById(postId).populate('comments.user');
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
    const post = await postModel.findById(postId);
    if (!post) return null;

    const comment = post.comments.id(commentId);
    if (!comment) return null;

    if (!comment.likes) comment.likes = [];
    if (!comment.dislikes) comment.dislikes = [];

    const r = toggleReaction(comment.likes, comment.dislikes, userId, 'like');
    comment.likes = r.likes;
    comment.dislikes = r.dislikes;
    await post.save();
    return reactionState(comment, userId);
}

async function toggleCommentDislike(postId, commentId, userId) {
    const post = await postModel.findById(postId);
    if (!post) return null;

    const comment = post.comments.id(commentId);
    if (!comment) return null;

    if (!comment.likes) comment.likes = [];
    if (!comment.dislikes) comment.dislikes = [];

    const r = toggleReaction(comment.likes, comment.dislikes, userId, 'dislike');
    comment.likes = r.likes;
    comment.dislikes = r.dislikes;
    await post.save();
    return reactionState(comment, userId);
}

async function updatePostContent(id, content) {
    return await postModel.findOneAndUpdate({ _id: id }, { content }, { new: true });
}

async function deletePost(id, userId) {
    const post = await postModel.findById(id);
    if (!post) return { ok: false, reason: "NOT_FOUND" };
    if (post.user.toString() !== userId.toString()) return { ok: false, reason: "NOT_OWNER" };

    await postModel.findByIdAndDelete(id);
    const user = await userModel.findById(post.user);
    user.posts = user.posts.filter(pid => pid.toString() !== id.toString());
    await user.save();
    return { ok: true };
}

async function createPost(userEmail, content, image = null) {
    const user = await userModel.findOne({ email: userEmail });
    const post = await postModel.create({ user: user._id, content, image, likes: [], dislikes: [] });
    user.posts.push(post._id);
    await user.save();
    return post;
}

module.exports = {
    PAGE_SIZE,
    getProfileByEmail,
    getAllPosts,
    toggleLike,
    toggleDislike,
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
