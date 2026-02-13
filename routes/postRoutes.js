const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { isLoggedIn } = require("../middleware/auth");

router.get("/profile", isLoggedIn, postController.getProfile);
router.get("/feed", isLoggedIn, postController.getFeed);
router.get("/like/:id", isLoggedIn, postController.toggleLike);
router.get("/edit/:id", isLoggedIn, postController.getEdit);
router.post("/update/:id", isLoggedIn, postController.postUpdate);
router.post("/delete/:id", isLoggedIn, postController.postDelete);
router.post("/post", isLoggedIn, postController.postCreate);

module.exports = router;

