var express = require('express');
var router = express.Router();
var db_event = require('../models/db_event');
var nodemailer = require('nodemailer');
var common = require('../lib/common');
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

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'zipdoc79@gmail.com', //사용할 인증 이메일 주소
        pass: 'team2015!@' // 사용할 인증 이메일의 패스워드
    }
});
var inputCheck = {
    "message":"입력 내용을 다시 확인해주세요"
};
/*
 이벤트보기 프로토콜
 ver 0.5
 */
router.get('/list', function (req, res, next) {

    var list_obj = {
        "message": "이벤트 보기를 완료하였습니다!"
    };
    var list_obj_fail = {
        "message": "이벤트 보기가 실패하였습니다.!"
    };

    db_event.list(function (rows) {
        if (rows) {
            res.json({
                success: 1,
                result: rows
            });
        } else {
            res.json({
                success: 0,
                result: list_obj_fail
            });
        }
    });
});
/*
 이벤트참여하기 프로토콜
 더미
 ver 0.5
 */
router.post('/join/:evnum', function (req, res, next) {
    var evnum = req.params.evnum;
    var name = req.body.name;
    var phone = req.body.phone;
    var User_time = req.body.User_time;
    var Req_content = req.body.Req_content;
    var datas = [evnum, name, phone, User_time, Req_content];

    var join_obj = {
        "message": "이벤트 신청 성공 !"
    };
    var join_obj_fail = {
        "message": "이벤트 신청 실패!"
    };

    if (!checkNull(datas)) {
        res.json({
            success: 0,
            result: inputCheck
        });
    } else {
        db_event.join(datas, function (success) {
            if (success) {
                var mailOptions = {
                    from: datas[1]+'<'+datas[2]+'>', // sender address
                    to: 'zipdoc79@gmail.com', // list of receivers
                    subject: '이벤트 신청 요청', // Subject line
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
                    success:1,
                    result: join_obj});
            } else {
                res.json({
                    success:0,
                    result: join_obj_fail});
            }
        });
    }
});

/*
 이벤트 상세보기 프로토콜
 ver 0.5
 */
router.get('/list/:evnum', function (req, res, next) {
    var evnum = req.params.evnum;
    evnum = parseInt(evnum);
    var data = [evnum];

    console.log('data',data);
    var list_obj = {
        "message": "이벤트  상세 보기를 완료하였습니다!"
    };
    var list_obj_fail = {
        "message": "이벤트 상세 보기가 실패하였습니다.!"
    };//

    db_event.eventInfo(data,function (rows) {
        if (rows) {
            res.json({
                success: 1,
                result:rows
            });
        } else {
            res.json({
                success: 0,
                result: list_obj_fail
            });
        }
    });
});

/*
이벤트 등록 ( 관리 )
 */
router.post('/register', function(req,res,next){
    var cnum = req.body.cnum;
    var event_photo_thumb = req.files.event_photo_thumb;
    var event_content = req.body.event_content;
    var event_title = req.body.event_title;
    var user_id = req.session.user_id;

    var datas = [cnum, event_photo_thumb,event_content,event_title,user_id];
    //0,1,2,3,4

    db_event.register(datas,function(row){
        if(row.length>0){
            res.json({
               success:1,
                result:{
                    "message":"이벤트 등록이 완료 되었습니다."
                }
            });
        }else{
            res.json({
               success:0,
                result:{
                    "message":"이벤트 등록이 실패 하였습니다."
                }
            });
        }
    });
});

/*
이벤트 사진 올리기 ( 관리 )
 */
var uploadEventPhoto = function(req,res,next){
    var cnum = req.params.cnum;
    var user_id = req.session.user_id;
    var pictures = req.files.pictures;
    var picturesList = [];

    console.log('req.files', req.files);
    if (pictures instanceof  Array) {
        picturesList = pictures;
    } else {
        picturesList.push(pictures);
    }

    var arr = picturesList;
    var index = 0;
    var publicPath = './public';
    var folderPath = publicPath + '/images/uploads/event' + user_id;

    fs.exists(folderPath, function (exists) {
        if (exists) {
            logger.debug('이미 존재 하는 디렉토리입니다.');
            res.json({
                result: {message: "이미 존재 하는 디렉토리 입니다."}
            });
        } else {
            fs.mkdir(folderPath, function (err) {
                if (err) {
                    console.error('mkdir error', err);
                    res.json({
                        "result": {
                            "message": "사진 저장 실패 - 폴더 생성 실패"
                        }
                    });
                } else {
                    var count = 0;
                    async.each(arr, function (file, callback) {
                            var count = arr.indexOf(file);
                            console.log('file aaa', file);
                            var oldPath = './' + file.path.replace(/\\/gi, '/');
                            var newPath = folderPath + '/' + Date.now() + '_' + (index++) + '.' + file.extension;
                            console.log('newPath', newPath);
                            fs.rename(oldPath, newPath, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    pool.getConnection(function (err, conn) {
                                        var temp = newPath.replace('./public', '');
                                        console.log('temp', temp);
                                        var sql = "insert into Event_photo (EventNum, Event_photo_path) values (?,?)";
                                        conn.query(sql, [cnum, temp], function (err) {
                                            if (err) {
                                                common.rollback(err,"uploadEventPhoto",conn);
                                                console.error('sql error');
                                            }
                                            if (count == 0) {
                                                console.log('count', count);
                                                var update_sql = "update EventList set Event_Photo_thumb = ? where EventNum = ?";
                                                conn.query(update_sql, [temp, cnum], function (err) {
                                                    console.log('temp thumbnail', temp);
                                                    if (err){
                                                        console.error('update sql error');
                                                    }else{
                                                        conn.release();
                                                    }
                                                    count++;
                                                    common.commit("uploadEventPhoto",conn);
                                                });
                                            }
                                        });
                                    });
                                    callback();
                                }
                            });
                        }, function (err) {
                            if (err) {
                                console.error('async error', err);
                                res.json({
                                    success: 0,
                                    "result": {
                                        "message": "upload fail"
                                    }
                                });
                            } else {
                                res.json({
                                    success: 1,
                                    "result": {
                                        "message": "uplaod success"
                                    }
                                });
                            }
                        }
                    );
                }
            });
        }
    });
}
router.post('/photos/:evnum', uploadEventPhoto);

/*
이벤트 사진 수정 하기 (관리)
 */
var updateEventPhoto = function(req,res,next){
    var evnum = req.params.evnum;
    var user_id = req.session.user_id;
    var pnum = req.body.pnum;
    var pictures = req.files.pictures;
    var picturesList = [];

    if (pictures instanceof  Array) {
        picturesList = pictures;
    } else {
        picturesList.push(pictures);
    }

    var pnumList = [];
    if (pnum instanceof Array) {
        pnumList = pnum.map(function (x) {
            return parseInt(x, 10);
        });
        console.log('pnumList:', pnumList);
    } else {
        pnumList.push(pnum);
        console.log('pnumList:', pnumList);
    }

    var arr = picturesList;
    var index = 0;
    var publicPath = './public';
    var folderPath = publicPath + '/images/uploads/' + user_id;

    var check_photo = 'select photo_path from Company_photo where Company_Num = ?';
    if (!req.session.user_id) {
        console.error('err');
        res.json({
            result: {
                "message": "세션이 만료 되었습니다."
            }
        });
    } else {
        if (!common.checkNull(pictures) || !common.checkBlank(pictures)) {
            res.json({
                result: {
                    "message": "입력 값을 확인하세요"
                }
            });
        } else {
            pool.getConnection(function (err, conn) {
                if (err) {
                    console.log('err', err);
                }
                fs.exists(folderPath, function (exists) {
                    if (!exists) {
                        logger.debug('존재 하지 않는 디렉토리입니다.');
                        res.json({
                            result: {message: "존재 하지 않는 디렉토리 입니다."}
                        });
                    } else {
                        conn.query(check_photo, [evnum], function (err, rows) {
                            if (err) {
                                callback(err);
                                return;
                            } else {
                                if (rows.length) {
                                    async.each(arr, function (file, callback) {
                                        var index = arr.indexOf(file);
                                        console.log('pnumList[index]', pnumList[index]);
                                        console.log('async start');
                                        var oldPath = './' + file.path.replace(/\\/gi, '/');
                                        var newPath = folderPath + '/' + Date.now() + '_' + index + '.' + file.extension;
                                        fs.rename(oldPath, newPath, function (err) {
                                            if (err) {
                                                callback(err);
                                            } else {
                                                var temp = newPath.replace('./public', '');
                                                pool.getConnection(function (err, conn) {
                                                    var sql = "update Company_photo set Photo_Path = ?"
                                                        + " where Photo_Num = " + pnumList[index] + "";
                                                    conn.query(sql, [temp], function (err) {
                                                        if (err) console.error('sql error');
                                                        if (index == 0) {
                                                            console.log('temp', temp);
                                                            var update_sql = "update Company_info set Company_Thumbnail = ? where Company_Num = ?";
                                                            conn.query(update_sql, [temp, evnum], function (err) {
                                                                console.log('temp thumbnail', temp);
                                                                if (err) console.error('update sql error');
                                                            });
                                                        }
                                                    });
                                                });
                                                callback();
                                            }
                                        });
                                    }, function (err) {
                                        if (err) {
                                            console.error('async error', err);
                                            res.json({
                                                success: 0,
                                                "result": {
                                                    "message": "upload fail"
                                                }
                                            });
                                        } else {
                                            res.json({
                                                success: 1,
                                                "result": {
                                                    "message": "uplaod success !"
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        });//conn
                    }
                });
            });
        }
    }
}
router.post('/photos/modify/:evnum', updateEventPhoto);
module.exports = router;

/*
이벤트 삭제하기
 */
router.post('/unregister/:evnum', function(req,res,next){
    var evnum = req.params.evnum;
    evnum = parseInt(evnum);
    var data = [evnum];

    db_event.unregister(data,function(row){
        if(row.length){
            res.json({
                success:1,
                result:{
                    "message":"이벤트 삭제가 완료 되었습니다. -> N"
                }
            });
        }else{
            res.json({
                success:0,
                result:{
                    "message":"이벤트 삭제가 실패 하였습니다. -> Y"
                }
            });
        }
    });
});

