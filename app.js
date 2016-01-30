var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var routes = require('./routes/index');
var users = require('./routes/users');
//추가 routes
var company = require('./routes/company');
var request = require('./routes/request');
var event = require('./routes/event');
var uuid = require('./routes/uuid');
var board = require('./routes/board');
var coupon = require('./routes/coupon');
var photo = require('./routes/photo');
var modi = require('./routes/modi');

var supervisor = require('./routes/supervisor');
var redis = require('redis'); //redis
var RedisStore = require('connect-redis')(session);
var client = redis.createClient();
client.select(8);
//추가 모듈
var nodemailer = require('nodemailer');
var easyimg = require('easyimage');
var multer = require('multer');

var app = express();

app.use(multer({
  dest: './public/uploads',
  rename: function (fieldname, filename) {
    return filename.toLowerCase() + Date.now();
  }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());



app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUnitinialized: true,
  store: new RedisStore({
    host: 'localhost',
    port: 6739,
    ttl: 60*60*10,
    client: client
  })
}));


app.use(require('express-domain-middleware'));
app.use('/', routes);
app.use('/users', users);
//추가 use
app.use('/company', company);
app.use('/request', request);
app.use('/event', event);
app.use('/uuid',uuid);
app.use('/coupon', coupon);
app.use('/supervisor',supervisor);
app.use('/board', board);
app.use('/photo',photo);
app.use('/modi',modi);

//with domain-middleware
app.use(function errorHandler(err, req, res, next) {
  console.log('error on request %d %s %s', process.domain.id, req.method, req.url);
  console.log(err.stack);
  var temp = err.stack;
  var error = temp.substring(0,temp.indexOf('\n'));
  res.status(500).json({
    success:0, 'message':error});
  if(err.domain) {
    //you should think about gracefully stopping & respawning your server
    //since an unhandled error might put your application into an unknown state
  }
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//서버추가
var http = require('http');
app.set('port', 80);
var server = http.createServer(app);
server.listen(app.get('port'));
console.log('서버가' + app.get('port') + '번에서 실행중');

module.exports = app;
