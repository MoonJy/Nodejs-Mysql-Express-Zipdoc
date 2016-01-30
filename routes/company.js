var express = require('express');
var router = express.Router();
var db_company = require('../models/db_company');
var easyimg = require('easyimage');
var nodemailer = require('nodemailer');
var path = require('path');
var fs = require('fs');
var fstools = require('fs-tools');
var mysql = require('mysql');
var common = require('../lib/common');
var async = require('async');
var logger = require('../config/logger');
var dbconfig = require('../models/db_config');
var crypto = require('crypto');

var pool = mysql.createPool(dbconfig); // pool 만들기
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'zipdoc79@gmail.com', //사용할 인증 이메일 주소
        pass: 'team2015!@' // 사용할 인증 이메일의 패스워드
    }
});

var inputCheck = {
    "message": "입력 내용을 다시 확인해주세요"
};

var sessionCheck = {
    "message": "사용자인증에 실패하였습니다."
};
/*
 로그인 프로토콜
 ver 1.0
 */
router.post('/login', function (req, res, next) {
    var email = req.body.email;
    var serial = req.body.serial;
    var datas = [email, serial];

    var checkEmailType = function (email) {
        var regExp = /[0-9a-zA-Z][_0-9a-zA-Z-]*@[_0-9a-zA-Z-]+(\.[_0-9a-zA-Z-]+){1,2}$/;
        if (!email.match(regExp)) {
            console.log('type error');
            return false;
        }
        return true;
    };

    // DB conn
    if (!common.checkNull(datas)) {
        res.json({
            success: 0,
            result: {
                "message": "아이디와 비밀번호를 확인하세요."
            }
        });
    } else {
        db_company.login(datas, function (success) {
            if (success) {
                logger.debug(email + '님이 로그인 하셨습니다.');
                console.log(req.session);
                req.session.user_id = email;
                var isMine = 1;
                if (!email) {
                    isMine = 0;
                } else {
                    isMine = 1;
                }
                res.json({
                    success: 1,
                    result: {
                        "message": "로그인 성공!",
                        isMine: isMine,
                        "company_num": success.cnt
                    }
                });
            } else {
                logger.debug(email + '님이 로그인에 실패하였습니다.');
                res.json({
                    success: 0,
                    result: {
                        "message": "로그인 문제가 발생하였습니다.!"
                    }
                });
            }
        });
    }
});

/*
 로그아웃 프로토콜
 ver 1.0
 */
router.post('/logout', function (req, res, next) {
    console.log('session', req.session.user_id);
    if (req.session.user_id != null || req.session.user_id == "" || (req.session.user_id).length == 0) {
        req.session.destroy(function (err) { // destroy시 login / uuid가 동시에 날라감
            if (err) {
                res.json({
                    success: 0,
                    result: {
                        "message": "로그아웃 실패!"
                    }
                });
            } else {
                res.json({
                    success: 1,
                    result: {
                        "message": "로그아웃 성공 r!"
                    }
                });
            }
        });
    } else {
        res.json({
            result: {
                "message": "인증 확인중 오류가 발생하였습니다."
            }
        });
    }
});

/*
 업체가입 프로토콜
 ver 1.0
 */
router.post('/register', function (req, res, next) {
    console.log('req.body', req.body);
    var name = req.body.name;
    var email = req.body.email;
    var address = req.body.address;
    var tel = req.body.tel;
    var phone = req.body.phone;
    var key = 'myKey';

    /*var salt = "" + Math.round( new Date().valueOf() * Math.random() ) + "";
    console.log('salt',salt);
    function do_ciper(inputPhone) {
        var pass = crypto.createHash("aes192").update(inputPhone + salt).digest('hex');
        return pass;
    }
    var crypto_phone = do_ciper(phone);*/

    var ciper = crypto.createCipher('aes192', key);
    ciper.update(phone, 'utf-8', 'base64');
    var ciperPhone = ciper.final('base64');

    var SerialNum = Math.floor(Math.random()*1000000)+100000;

    if(SerialNum>1000000){
        SerialNum = SerialNum - 100000;
    }
    var datas = [name, email, address, tel, phone,SerialNum ];
    if (!common.checkNull(datas) && !common.checkBlank(datas)) {
        res.json({
            success: 0,
            result: inputCheck
        });
    } else {
        db_company.register(datas, function (success) {
            if (success) {
                logger.debug(email + '이 가입을 요청 하였습니다.');
                var mailOptions = {
                    from: datas[0] + '<' + datas[1] + '>', // sender address
                    to: 'zipdoc79@gmail.com', // list of receivers
                    subject: '회원 가입 요청', // Subject line
                    text: 'test', // plaintext body
                    html: '<b>' + datas[0] + '<br>' + datas[1] + '<br>' + datas[2] + '<br>' + datas[3] + '<br>' + datas[4] + '</b>' // html body
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
                    result: {
                        "message": "업체가입 성공!"
                    }
                });
            } else {
                res.json({
                    success: 0,
                    result: {
                        "message": "업체가입 실패!"
                    }
                });
            }
        });
    }
});

/*
 업체 사진 수정하기
 */
/*function updatePhoto(req, res, next) {
    var cnum = req.params.cnum;
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
    } else {
        pnumList.push(pnum);
    }
    var arr = picturesList;
    var index = 0;
    var folderPath = path.join(__dirname, '..', 'public', 'images', 'uploads', user_id);
    console.log('folderPath', folderPath);
    var check_photo = 'select photo_path from Company_photo where Company_Num = ?';
    if (!req.session.user_id) {
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
                        conn.query(check_photo, [cnum], function (err, rows) {
                            if (err) {
                                callback(err);
                                return;
                            } else {
                                if (rows.length) {
                                    console.log('cnum', cnum);
                                    async.each(arr, function (file, callback) {
                                        var count = arr.indexOf(file);
                                        console.log('pnumList[index]', pnumList[count]);
                                        console.log('async start');
                                        var oldPath = './' + file.path.replace(/\\/gi, '/');
                                        var newPath = folderPath + '/' + Date.now() + '_' + index + '.' + file.extension;

                                        fs.rename(oldPath, newPath, function (err) {
                                            if (err) {
                                                callback(err);
                                            } else {
                                                var temp = newPath.replace('/home/ubuntu/projects/test2/public', '');
                                                var thumbPath = folderPath + '/' + Date.now() + '_' + (index++) + '-thumbnail' + '.' + file.extension;
                                                easyimg.thumbnail({
                                                    src: newPath, dst: thumbPath, // 절대 경로 쓸것
                                                    width: 242, height: 242,
                                                    x: 0, y: 0
                                                }).then(function (file) {
                                                    console.log('file', file);
                                                }, function (err) {
                                                    console.log('err thumb', err);
                                                });
                                                var thumbnailPath = thumbPath.replace('/home/ubuntu/projects/test2/public', '');
                                                var sql = "update Company_photo set Photo_Path = ?, Thumbnail = ?"
                                                    + " where Photo_Num = " + pnumList[count] + "";
                                                conn.query(sql, [temp, thumbnailPath], function (err) {
                                                    if (err) console.error('sql error');
                                                    console.log('pnumList update query', pnumList[count]);
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
                                            var select_list = "SELECT Thumbnail FROM Company_photo WHERE Company_Num = ?"
                                                + " ORDER BY photo_Num ASC LIMIT 1";
                                            var update_thumb = "update Company_info SET Company_Thumbnail = ?"
                                                + " where Company_Num = ?";
                                            conn.beginTransaction(function (err) {
                                                if (err) {
                                                    common.dbExit(err, "썸네일 변경중", conn);
                                                    return;
                                                }
                                                conn.query(select_list, data, function (err, row) {
                                                    if (err) {
                                                        console.error('err', err);
                                                    } else {
                                                        console.log(row[0].Thumbnail);
                                                        var thumbnail = row[0].Thumbnail;
                                                        conn.query(update_thumb, [thumbnail, data[0]], function (err,
                                                                                                                 row) {
                                                            if (err) {
                                                                common.rollback(err, "썸네일 변경중", conn);
                                                                console.error('conn.query', err);
                                                            }
                                                            var success = false;
                                                            console.log('conn.query', data);
                                                            if (row.affectedRows == 1) {
                                                                console.log('affectedRows');
                                                                commit("uploadPhoto", connection);
                                                                success = true;
                                                                res.json({
                                                                    success: 1,
                                                                    "result": {
                                                                        "message": "uplaod success !"
                                                                    }
                                                                });
                                                            }
                                                            conn.release();
                                                            callback(success);
                                                        });
                                                    }
                                                });
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
router.post('/modify/:cnum/photos', updatePhoto); // 수정하기 라우터*/
/*

/*
 업체리스트 태그 검색으로 가져오기
 DB
 ver 0.4
 */
router.get('/keyword', function (req, res, next) {
    var uuid = req.session.uuid;
    var keyword = req.query.keyword;
    var lat = req.query.lat;
    lat = parseFloat(lat);
    var lon = req.query.lon;
    lon = parseFloat(lon);
    var page = req.query.page;
    page = parseInt(page);
    var data = [keyword, lat, lon, page, uuid];

    console.log('data', data);
    var list_obj_fail = {
        "message": "업체 리스트보기에 실패 하였습니다!"
    };

    //DB conn
    if (!common.checkNull(data)) {
        res.json({
            result: "입력 값을 확인해주세요!"
        });
    } else {
        db_company.keyword(data, function (rows) {
            if (rows) {
                logger.debug(data[0] + '로 태그 검색을 하였습니다.');
                res.json({
                    success:1,
                    result: rows
                    //cnt: rows.length
                });
            } else {
                logger.debug('태그 검색이 실패하였습니다.');
                res.json({result: list_obj_fail});
            }
        });
    }
});

/*
 업체리스트 카테고리 검색으로 가져오기
 DB
 ver 0.4
 */
router.get('/category', function (req, res, next) {
    var uuid = req.session.uuid;
    var category = req.query.category;
    category = parseInt(category);
    var lat = req.query.lat;
    lat = parseFloat(lat);
    var lon = req.query.lon;
    lon = parseFloat(lon);
    var page = req.query.page;
    page = parseInt(page);
    var data = [category, lat, lon, page, uuid];

    console.log('data', data);
    var list_obj_fail = {
        "message": "업체 리스트보기에 실패 하였습니다!"
    };

    //DB conn
    if (!common.checkNull(data)) {
        res.json({
            result: "입력 값을 확인해주세요!"
        });
    } else {
        db_company.category(data, function (rows) {
            if (rows) {
                res.json({
                    success:1,
                    result: rows
                });
            } else {
                res.json({result: list_obj_fail});
            }
        });
    }
});


/*
 업체정보 프로토콜
 더미
 ver 0.4
 */
router.get('/info/:cnum', function (req, res, next) {
    var cnum = req.params.cnum;
    var uuid = req.session.uuid;
    var data = [cnum, uuid];

    var info_obj_fail = {
        message: "업체상세보기를 실패하였습니다."
    };
    //DB conn
    db_company.info(data, function (results) {
        if (results) {
            logger.debug(cnum + '번 업체를 검색 하였습니다.');
            res.json({
                success:1,
                result: results
            });
        } else {
            res.json({
                success:0,
                result: info_obj_fail
            });
        }
    });
});

/*
 업체즐겨찾기추가 프로토콜
 더미
 ver 0.5
 */
router.post('/favoriteY', function (req, res, next) {
    var uuid = req.body.uuid;
    var cnum = req.body.cnum;
    cnum = parseInt(cnum);
    var datas = [uuid, cnum];

    var favorite_obj_fail = {
        "message": "즐겨찾기 실패하였습니다.!"
    };

    //DB conn
    if (!common.checkNull(datas)) {
        res.json({
            success: 0,
            result: inputCheck
        });
    } else {
        if (!req.session.uuid) {
            res.json({
                result: sessionCheck
            });
        }
        db_company.favoriteY(datas, function (success) {
            if (success) {
                console.log('datas', datas);
                console.log('res.session.uuid', req.session.uuid);
                console.log('res.session.user_id', req.session.user_id);
                var isFavorite = 0;
                if (uuid == req.session.uuid) {
                    isFavorite = 1;
                }
                res.json({
                    success: 1,
                    "result": {
                        "message": "즐겨찾기 성공 완료.!",
                        "isFavorite": isFavorite
                    }
                });
            } else {
                res.json({
                    success: 0,
                    result: favorite_obj_fail
                });
            }
        });
    }
});

/*
 업체즐겨찾기삭제 프로토콜
 더미
 ver 0.4
 */
router.post('/favoriteN', function (req, res, next) {
    var uuid = req.body.uuid; // req.body.uuid <- 변수
    var cnum = req.body.cnum;
    cnum = parseInt(cnum);
    var datas = [uuid, cnum];

    var favoriteN_obj_fail = {
        "message": "즐겨찾기 취소 실패 !"
    };
    if (!common.checkNull(datas)) {
        res.json({
            result: {
                "message": "입력값을 확인해주세요."
            }
        });
    } else {
        if (!req.session.uuid) {
            res.json({
                result: sessionCheck
            });
        }
        //DB conn
        db_company.favoriteN(datas, function (success) {
            if (success) {
                console.log('datas', datas);
                console.log('res.session.uuid', req.session.uuid);
                console.log('res.session.user_id', req.session.user_id);
                res.json({
                    result: {
                        "message": "즐겨찾기 취소 성공!"
                    }
                });
            } else {
                res.json({result: favoriteN_obj_fail});
            }
        });
    }
});
/*
 업체즐겨찾기보기 프로토콜
 더미
 ver 0.1
 */
router.get('/favorite', function (req, res, next) {
    var uuid = req.query.uuid;
    var data = [uuid];

    var favorite_obj_fail = {
        "message": "즐겨찾기 보기가 실패하였습니다.!"
    };
    if (!common.checkNull(data)) {
        res.json({
            result: inputCheck
        });
    } else {
        if (!req.session.uuid) {
            res.json({
                result: sessionCheck
            });
        }
        //DB conn
        db_company.favorite(data, function (rows) {
            if (rows) {
                res.json({result: rows});
            } else {
                res.json({result: favorite_obj_fail});
            }
        });
    }
});

/*
 업체 탈퇴 여부 ( 관리 )
 */
var withdrawCompany = function (req, res, next) {
    var cnum = req.params.cnum;
    cnum = parseInt(cnum);
    var data = [cnum];

    db_company.withdraw(data, function (row) {
        if (row.length) {
            res.json({
                success: 1,
                result: {
                    message: "업체가 탈퇴 되었습니다."
                }
            });
        } else {
            res.json({
                result: {
                    message: "업체 탈퇴처리 중 실패하였습니다."
                }
            });
        }
    });
}
router.post('/withdraw/:cnum', withdrawCompany);
module.exports = router;