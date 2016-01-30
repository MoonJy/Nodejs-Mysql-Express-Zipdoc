var express = require('express');
var router = express.Router();

//var message = new gcm.Message();

// pushKey
var regIds = [];

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//router.post('/register', function (req, res, next) {
//  var regId = req.body.regId;
//  console.log('Registe pushKey! - ', regId);
//  regIds.push(regId);
//  res.end();
//});
//
//router.post('/unregister', function (req, res, next) {
//  var regId = req.body.regId;
//  console.log('Unregiste pushKey! - ', regId);
//  regIds.splice(regIds.indexOf(regId));
//  res.end();
//});
//
//router.post('/push', function (req, res, next) {
//  var message = new gcm.Message();
//  var sender = new gcm.Sender('AIzaSyDMT2TWr2WyLQUW64m4qXmdQOoMRAUuPu4'); //Server API key
//
//  console.log('req.body', req.body);
//  var message1 = req.body.message1;
//  var message2 = req.body.message2;
//
//  message.addData('key1', message1);
//  message.addData('key2', message2);
//
//  sender.sendNoRetry(message, regIds, function (err, result) {
//    if(err) console.error('err', err);
//    else consloe.log('result', result);
//  });
//
//  res.redirect('/');
//
//});

module.exports = router;
