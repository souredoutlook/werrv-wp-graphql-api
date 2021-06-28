const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

const Sentry = require("@sentry/node");

const fetch = require("node-fetch");

const indexRouter = require('./routes/index');

const app = express();

Sentry.init({ dsn: "https://84c7e2e6d3344ffdaf2b4ab8c9fd74df@o676634.ingest.sentry.io/5829638" });

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', indexRouter(fetch));

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});


module.exports = app;
