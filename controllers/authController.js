const authService = require("../services/authService");

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
    try {
        const result = await authService.register({ email, password, username, name, age });
        const isProd = process.env.NODE_ENV === 'production';
        const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' };
        res.cookie("token", result.token, cookieOpts);
        res.redirect("/profile");
    } catch (err) {
        if (err && err.code === "EXISTS") return res.redirect("/login?exists=1");
        return res.redirect("/login");
    }
}

// Handle login - FIXED: Using async/await instead of callback
async function postLogin(req, res) {
    let { email, password } = req.body;

    // Validate that email and password are provided
    if (!email || !password) {
        return res.redirect("/login");
    }

    try {
        const result = await authService.login({ email, password });
        if (result && result.token) {
            const isProd = process.env.NODE_ENV === 'production';
            const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' };
            res.cookie("token", result.token, cookieOpts);
            return res.redirect("/profile");
        }
        return res.redirect("/login");
    } catch (err) {
        return res.redirect("/login");
    }
}

// Logout
async function logout(req, res) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' };
    res.clearCookie("token", cookieOpts);
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
