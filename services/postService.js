const userModel = require("../models/user");
const postModel = require("../models/post");

async function getProfileByEmail(email) {
    let user = await userModel.findOne({ email: email })
        .populate("posts")
        .populate({ path: "sharedPosts", populate: { path: "user", model: "user" } });

    // Fetch posts where this user is a collaborator
    const collabPosts = await postModel.find({ collaborators: user._id })
        .populate("user");

    return { user, collabPosts };
}

async function getAllPosts() {
    let posts = await postModel.find({}).populate("user").populate('comments.user').sort({ date: -1 });
    return posts;
}

async function toggleLike(postId, userId) {
    let post = await postModel.findOne({ _id: postId }).populate("user");
    if (post.likes.indexOf(userId) === -1) post.likes.push(userId);
    else post.likes.splice(post.likes.indexOf(userId), 1);
    await post.save();
    return post;
}

async function toggleDislike(postId, userId) {
    let post = await postModel.findOne({ _id: postId });
    if (!post.dislikes) post.dislikes = [];
    const idx = post.dislikes.findIndex(id => id.toString() === userId.toString());
    if (idx === -1) {
        post.dislikes.push(userId);
        // remove like if present
        const likeIdx = post.likes.findIndex(id => id.toString() === userId.toString());
        if (likeIdx !== -1) post.likes.splice(likeIdx, 1);
    } else {
        post.dislikes.splice(idx, 1);
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
    const idx = comment.likes.findIndex(id => id.toString() === userId.toString());
    if (idx === -1) comment.likes.push(userId);
    else comment.likes.splice(idx, 1);

    await post.save();
    return { ok: true, likes: comment.likes.length };
}

async function updatePostContent(id, content, userId) {
    const post = await postModel.findById(id);
    if (!post) return { ok: false, reason: 'NOT_FOUND' };
    const isOwner = post.user.toString() === userId.toString();
    const isCollab = (post.collaborators || []).some(c => c.toString() === userId.toString());
    if (!isOwner && !isCollab) return { ok: false, reason: 'NOT_ALLOWED' };
    post.content = content;
    await post.save();
    return { ok: true };
}

async function deletePost(id, userId) {
    let post = await postModel.findOne({ _id: id });
    if (!post) return { ok: false, reason: "NOT_FOUND" };

    const isOwner = post.user.toString() === userId.toString();
    const isCollab = (post.collaborators || []).some(c => c.toString() === userId.toString());
    if (!isOwner && !isCollab) return { ok: false, reason: "NOT_ALLOWED" };

    await postModel.findByIdAndDelete(id);
    // Remove from owner's posts array
    let owner = await userModel.findOne({ _id: post.user });
    owner.posts = owner.posts.filter(pid => pid.toString() !== id.toString());
    await owner.save();
    return { ok: true };
}

async function createPost(userEmail, content) {
    let user = await userModel.findOne({ email: userEmail });
    let post = await postModel.create({ user: user._id, content });

    user.posts.push(post._id);
    await user.save();
    return post;
}

// Share a post with another user (by userId)
async function sharePost(postId, fromUserId, toUserId) {
    if (fromUserId.toString() === toUserId.toString()) {
        return { ok: false, reason: 'CANNOT_SHARE_WITH_SELF' };
    }

    const post = await postModel.findById(postId);
    if (!post) return { ok: false, reason: 'POST_NOT_FOUND' };

    const recipient = await userModel.findById(toUserId);
    if (!recipient) return { ok: false, reason: 'USER_NOT_FOUND' };

    // Downgrade: if already collab, remove from collaborators and add to sharedPosts
    const collabIdx = (post.collaborators || []).findIndex(id => id.toString() === toUserId.toString());
    if (collabIdx !== -1) {
        post.collaborators.splice(collabIdx, 1);
        await post.save();
        const alreadyShared = (recipient.sharedPosts || []).some(id => id.toString() === postId.toString());
        if (!alreadyShared) {
            recipient.sharedPosts.push(postId);
            await recipient.save();
        }
        return { ok: true, downgraded: true };
    }

    // Don't add duplicates
    const alreadyShared = (recipient.sharedPosts || []).some(
        id => id.toString() === postId.toString()
    );
    if (alreadyShared) return { ok: false, reason: 'ALREADY_SHARED' };

    recipient.sharedPosts.push(postId);
    await recipient.save();
    return { ok: true };
}

// Collab Share — adds user to post.collaborators, upgrades from sharedPosts if already there
async function collabShare(postId, fromUserId, toUserId) {
    if (fromUserId.toString() === toUserId.toString())
        return { ok: false, reason: 'CANNOT_SHARE_WITH_SELF' };

    const post = await postModel.findById(postId);
    if (!post) return { ok: false, reason: 'POST_NOT_FOUND' };

    // Only post owner can collab-share
    if (post.user.toString() !== fromUserId.toString())
        return { ok: false, reason: 'NOT_OWNER' };

    const recipient = await userModel.findById(toUserId);
    if (!recipient) return { ok: false, reason: 'USER_NOT_FOUND' };

    const alreadyCollab = (post.collaborators || []).some(id => id.toString() === toUserId.toString());
    if (alreadyCollab) return { ok: false, reason: 'ALREADY_COLLAB' };

    // Upgrade: remove from sharedPosts if normal-shared before
    const sharedIdx = (recipient.sharedPosts || []).findIndex(id => id.toString() === postId.toString());
    if (sharedIdx !== -1) {
        recipient.sharedPosts.splice(sharedIdx, 1);
        await recipient.save();
    }

    post.collaborators.push(toUserId);
    await post.save();
    return { ok: true };
}
async function getAllUsersExcept(currentUserId) {
    return await userModel.find(
        { _id: { $ne: currentUserId } },
        'username name'   // only return what the modal needs
    );
}

module.exports = {
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
    sharePost,
    getAllUsersExcept,
    collabShare,
};
