// const express = require("express");
// const router = express.Router();
// const authController = require("../controllers/authController");

// router.get("/", authController.getLanding);
// router.get("/login", authController.getLogin);
// router.post("/login", authController.postLogin);
// router.get("/signup", authController.getSignup);
// router.post("/register", authController.postRegister);
// router.get("/logout", authController.logout);

// module.exports = router;

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { body, validationResult } = require('express-validator');

router.get("/", authController.getLanding);
router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);
router.get("/signup", authController.getSignup);

router.post("/register", [
body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
body('password').isLength({ min: 6 }).withMessage('Password must be 6+ characters'),
body('username').notEmpty().withMessage('Username is required'),
body('age').isInt({ min: 13 }).withMessage('Must be 13+')
], (req, res, next) => {
const errors = validationResult(req);
if (!errors.isEmpty()) return res.status(400).send(errors.array()[0].msg);
next();
}, authController.postRegister);

router.get("/logout", authController.logout);

module.exports = router;

