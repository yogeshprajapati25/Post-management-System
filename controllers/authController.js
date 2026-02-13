const userModel = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Landing page
async function getLanding(req, res) {
    res.render("index");
}

// Login page
async function getLogin(req, res) {
    res.render("login", { exists: req.query.exists, registered: req.query.registered });
}

// Signup page
async function getSignup(req, res) {
    res.render("signup");
}

// Handle signup
async function postRegister(req, res) {
    let { email, password, username, name, age } = req.body;

    let user = await userModel.findOne({ email: email });
    if (user) return res.redirect("/login?exists=1");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash
            });

            // After signup, log the user in and go to profile
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            res.redirect("/profile");
        });
    });
}

// Handle login - FIXED: Using async/await instead of callback
async function postLogin(req, res) {
    let { email, password } = req.body;

    // Validate that email and password are provided
    if (!email || !password) {
        return res.redirect("/login");
    }

    let user = await userModel.findOne({ email: email });
    // If user not found, send back to login instead of showing error page
    if (!user) return res.redirect("/login");

    try {
        // Use await instead of callback - this ensures redirect happens synchronously after password check
        const result = await bcrypt.compare(password, user.password);
        
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            return res.redirect("/profile");
        } else {
            return res.redirect("/login");
        }
    } catch (err) {
        return res.redirect("/login");
    }
}

// Logout
async function logout(req, res) {
    res.cookie("token", "");
    res.redirect("/login");
}

module.exports = {
    getLanding,
    getLogin,
    getSignup,
    postRegister,
    postLogin,
    logout,
};
