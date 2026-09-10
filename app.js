require('dotenv').config({ path: __dirname + '/.env' });
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', authRoutes);
app.use('/', postRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Listening ${PORT} - Mongo connected`));
  })
  .catch(err => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });
