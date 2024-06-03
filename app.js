require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const router = require('./routes/v1/index');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());

app.use(router);

app.get('/', (req, res) => {
  res.send('<h1> Hello world </h1>');
});

// 500 error handler
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({
    status: false,
    message: err.message,
    data: null,
  });
});

// 404 error handler
app.use((req, res, next) => {
  res.status(404).json({
    status: false,
    message: `are you lost? ${req.method} ${req.url} is not registered!`,
    data: null,
  });
});

app.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

module.exports = app;
