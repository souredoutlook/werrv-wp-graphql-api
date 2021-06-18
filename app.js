const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

const fetch = require("node-fetch");

const indexRouter = require('./routes/index');

const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', indexRouter(fetch));

module.exports = app;
