const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/", authController.getLanding);
router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);
router.get("/signup", authController.getSignup);
router.post("/register", authController.postRegister);
router.get("/logout", authController.logout);

module.exports = router;

