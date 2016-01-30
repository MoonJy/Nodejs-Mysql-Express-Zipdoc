var express = require('express');
var router = express.Router();
var db_request = require('../models/db_request');
var nodemailer = require('nodemailer');

var checkNull = function (array) {
    var check = true;
    var count = array.length;
    for (var i = 0; i < count; i++) {
        if (array[i] == null) {
            console.log('null param', i);
            check = false;
            break;
        }
    }
    return check;
};

var inputCheck = {
    "message": "입력 내용을 다시 확인해주세요"
};

var sessionCheck = {
    "message": "사용자인증에 실패하였습니다."
};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'zipdoc79@gmail.com', //사용할 인증 이메일 주소
        pass: 'team2015!@' // 사용할 인증 이메일의 패스워드
    }
});
/*
 문의하기 프로토콜
 더미
 ver 0.5
 */
router.post('/', function (req, res, next) {
    var uuid = req.session.uuid;
    var title = req.body.title;
    var category = req.body.category;
    var content = req.body.content;
    var email = req.body.email;
    var datas = [uuid, title, category, content, email];
    console.log('datas', datas);
    var request_obj = {
        "message": "문의 신청 성공 !"
    };
    var request_obj_fail = {
        "message": "문의 신청 실패 !"
    };

    if (!checkNull(datas)) {
        res.json({
            result: inputCheck
        });
    } else {
        if(!req.session.uuid){
            res.json({
                result:sessionCheck
            });
        }
    else
        {
            db_request.send_req(datas, function (success) {
                if (success) {
                    var mailOptions = {
                        from: datas[1] + '<' + datas[4] + '>', // sender address
                        to: 'zipdoc79@gmail.com', // list of receivers
                        subject: '문의 요청', // Subject line
                        text: 'test', // plaintext body
                        html: '<b>' + datas[1] + '<br>' + datas[2] + '<br>' + datas[3] + '<br>' + datas[4] + '<br>' + '</b>' // html body
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Message sent : ', info.response);
                        }
                    });
                    res.json({
                        success: 1,
                        result: request_obj
                    });
                } else {
                    res.json({
                        success: 0,
                        result: request_obj_fail
                    });
                }
            });
        }
    }
});

module.exports = router;