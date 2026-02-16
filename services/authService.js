const userModel = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function register({ email, password, username, name, age }) {
    let user = await userModel.findOne({ email: email });
    if (user) {
        const err = new Error("User already exists");
        err.code = "EXISTS";
        throw err;
    }

    const hash = await bcrypt.hash(password, 10);
    let created = await userModel.create({
        username,
        email,
        age,
        name,
        password: hash,
    });

    let token = jwt.sign({ email: email, userid: created._id }, "shhhh");
    return { user: created, token };
}

async function login({ email, password }) {
    let user = await userModel.findOne({ email: email });
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;

    let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
    return { user, token };
}

module.exports = { register, login };
