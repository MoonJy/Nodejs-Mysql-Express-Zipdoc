var express = require('express');
var router = express.Router();
var db_uuid = require('../models/db_uuid');
var logger = require('../config/logger');
var common = require('../lib/common');
var gcm = require('node-gcm');
var message = new gcm.Message();
var async = require('async');

var inputCheck = {
    "message": "입력 내용을 다시 확인해주세요"
};

var sessionCheck = {
    "message": "사용자인증에 실패하였습니다."
};

/*
 UUID, Reg_ID 전송
 */
router.post('/', function (req, res, next) {
    var uuid = req.body.uuid;
    var regid = req.body.regid;
    //uuid = parseInt(uuid);
    var data = [uuid, regid];
    console.log('data',data);
    var uuid_obj = {
        "message": "UUID 전송 성공"
    };
    var uuid_obj_fail = {
        "message": "UUID 전송 실패 - UUID 이미 존재"
    };
    if (!common.checkNull(data) || !common.checkBlank(data)) {
        res.json({
            result: {
                "message": "uuid 값을 다시 확인해주세요."
            }
        });
    } else {
        db_uuid.send_uuid(data, function (success) {
            if (success) {
                console.log('push test');
                logger.debug(data + '가 uuid로 접속시도하였습니다');
                req.session.uuid = uuid;
                res.json({
                    success: 1,
                    result: {
                        "message": "UUID 전송 성공"
                    }
                });
            } else {
                logger.debug(data + '가 uuid로 접속시도하였습니다');
                req.session.uuid = uuid;
                res.json({
                    success: 0,
                    result: uuid_obj_fail
                });
            }
        });
    }
});


/*
 푸쉬 전송 ( 관리자 )
 */
router.post('/push', function (req, res, next) {
    var message = new gcm.Message();
    var sender = new gcm.Sender('AIzaSyCrLI9QUKBF7DDI12TyGhaG0hFR07WJRMQ'); //Server API key

    var message1 = req.body.message1;
    var message2 = req.body.message2;

    message.addData('key1', message1);
    message.addData('key2', message2);


    console.log('message',message);
    var reg_id = [];

    db_uuid.reg_id(function (rows) {
        if (rows) {
            for(var i=0; i<rows.length;i++){
                reg_id.push(rows[i].Reg_id);
            }
            console.log('reg_id', reg_id);
            sender.sendNoRetry(message, reg_id, function (err, result) {
                console.log('result', result);
                if (err){
                    console.error('err === ', err);
                    res.json({
                       result:{
                           "message":"push transport fail"
                       }
                    });
                }
                else {
                    console.log('result', result);
                    res.end('<head><meta charset = "utf-8"><script> alert("푸쉬 전송 성공");history.back();</script></head>');
                }
            });
        } else {
        }
    });
});

module.exports = router;