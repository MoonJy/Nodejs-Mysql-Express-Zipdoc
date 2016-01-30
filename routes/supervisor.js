var express = require('express');
var router = express.Router();
var db_supervisor = require('../models/db_supervisor');


/*
관리자 로그인 ( 관리 )
 */
router.post('/login', function (req, res, next) {
    console.log('req.body', req.body);
    var id = req.body.id;
    var passwd = req.body.passwd;
    var datas = [id, passwd];
    db_supervisor.login(datas, function (success) {
        if (success) {
            req.session.user_id = id;
            res.redirect('/board/main');
        } else {
            res.end('<head><meta charset = "utf-8"><script> alert("아이디나 비밀번호가 틀려서 되돌아갑니다.!!!!");history.back();</script></head>');
        }
    });
});

router.get('/board/main', function(req,res,next){

});

router.get('/push', function(req,res,next){
    res.render('/push',{ title: 'push'});
});

module.exports = router;