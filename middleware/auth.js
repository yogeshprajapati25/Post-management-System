const jwt = require("jsonwebtoken");

function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    // If no token, send user to landing for login/signup
    if (!token) return res.redirect("/");

    try {
        let data = jwt.verify(token, "shhhh");
        req.user = data;
        next();
    } catch (err) {
        // Invalid or expired token – treat as not logged in
        return res.redirect("/");
    }
}

module.exports = { isLoggedIn };

