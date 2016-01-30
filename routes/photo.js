var fs = require('fs');
var mysql = require('mysql');
var common = require('../lib/common');
var logger = require('../config/logger');
var dbconfig = require('../models/db_config');
var express = require('express');
var router = express.Router();
var easyimg = require('easyimage');
var path = require('path');
var async = require('async');
var pool = mysql.createPool(dbconfig); // pool 만들기

/*
 이벤트 사진 등록 ( 관리 )
 이벤트를 등록하고 사진을 따로 업로드한다,
 */
function uploadEvent(req, res, next) {
    var evnum = req.params.evnum;
    var user_id = req.session.user_id; // 관리자로그인 관리자 super_Admin
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
    var folderPath = path.join(__dirname, '..', 'public', 'images', 'uploads', 'event', user_id);
    if(!req.session.user_id === 'super'){
        logger.debug('관리자가 아닙니다');
        res.json({
           result:{
               message:"관리자가 아닙니다"
           }
        });
    }else {
        fs.exists(folderPath, function (exists) {
            if (exists) {
                logger.debug('이미 존재 하는 디렉토리입니다.');
                async.each(arr, function (file, callback) {
                    console.log('file aaa', file);
                    var oldPath = './' + file.path.replace(/\\/gi, '/');
                    var newPath = folderPath + '/' + Date.now() + '_' + (index++) + '.' + file.extension;
                    console.log('newPath', newPath);
                    fs.rename(oldPath, newPath, function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            console.log('flow1');
                            pool.getConnection(function (err, conn) {
                                if (err) {
                                    common.dbError(err, "이벤트 사진 등록중");
                                    return;
                                }
                                console.log('flow1');
                                //이벤트 사진 등록
                                var select_event = "select count(EventNum) cnt from EventList where EventNum = ?"
                                conn.query(select_event, [evnum], function (err, row) {
                                    if (err) {
                                        console.error('err', err);
                                    } else {
                                        console.log('flow1');
                                        if (row[0].cnt == 1) {
                                            console.log('evnum Num is exist');
                                            var eventPath = newPath.replace('/home/ubuntu/projects/test2/public', '');
                                            var sql = "insert into Event_Photo (Event_photo_path, EventNum) values (?,?)";
                                            conn.query(sql, [eventPath, evnum], function (err) {
                                                if (err) console.error('sql error', err);
                                                else {
                                                    console.log('async each success end ');
                                                    callback();
                                                    conn.release();
                                                }
                                            });
                                        }
                                        else {
                                            console.log('error async');
                                            callback();
                                            conn.release();
                                        }
                                    }

                                });

                            });
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
                        async.each(arr, function (file, callback) {
                                console.log('file aaa', file);
                                var oldPath = './' + file.path.replace(/\\/gi, '/');
                                var newPath = folderPath + '/' + Date.now() + '_' + (index++) + '.' + file.extension;
                                console.log('newPath', newPath);
                                fs.rename(oldPath, newPath, function (err) {
                                    if (err) {
                                        console.log('directory error');
                                        callback(err);
                                    } else {
                                        pool.getConnection(function (err, conn) {
                                            if (err) {
                                                common.dbError(err, "이벤트 사진 등록중");
                                                return;
                                            }
                                            //이벤트 사진 등록
                                            var select_event = "select count(EventNum) cnt from Event_Photo where EventNum = ?"
                                            conn.query(select_event, [evnum], function (err, row) {
                                                if (row[0].cnt == 1) {
                                                    var sql = "insert into Event_photo (Event_photo_path, EventNum) values (?,?)";
                                                    conn.query(sql, [newPath, evnum], function (err) {
                                                        if (err) console.error('sql error', err);
                                                        else {
                                                            console.log('async each success end ');
                                                            //callback();
                                                            conn.release();
                                                        }
                                                    });
                                                } else {
                                                    //callback();
                                                    conn.release();
                                                }
                                            });

                                        });
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
}
router.post('/photos/:evnum', uploadEvent); // 이벤트 올리기

/*
 1. 사진 올리기, 로고 수정
 2. 사진 올리기, 로고 보류
 3. 사진 보류, 로고 수정
 4. 사진 보류, 로고 보류
 5. 사진 삭제, 로고 수정
 6. 사진 삭제, 로고 보류
 7. 사진 올리기, 사진 삭제
 8. 사진 삭제
 + 정보 수정
 */

function updateProfile(req, res, next) {
    var cnum = req.params.cnum;
    var user_id = req.session.user_id;
    var pictures = req.files.pictures;
    var picturesList = [];
    if (pictures instanceof  Array) {
        picturesList = pictures;
    } else {
        picturesList.push(pictures);
    }
    var arr = picturesList;
    var index = 0;
    var folderPath = path.join(__dirname, '..', 'public', 'images', 'uploads', user_id);
    console.log('picutres', pictures);
    //정보 수정 시작
    var owner = req.body.owner;
    var tel = req.body.tel;
    var phone = req.body.phone;
    var Homepage = req.body.Homepage;
    var Address = req.body.Address;
    var AvailableTime = req.body.AvailableTime;
    var introduce = req.body.introduce;
    var infoData = [owner, tel, phone, Homepage, Address, AvailableTime, introduce, user_id, cnum];
    console.log('infoData', infoData);
    //로고 수정 시작
    var cLogo = req.files.cLogo;

    //삭제 타입
    var pnum = req.body.pnum;

    var pnumList = [];
    if (pnum instanceof Array) {
        pnumList = pnum.map(function (x) {
            return parseInt(x, 10);
        });
    } else {
        pnum = parseInt(pnum);
        pnumList.push(pnum);
    }

    console.log('req.files', req.files);
    if (!req.session.user_id) {
        res.json({
            result: {
                message: "업체 관계자 로그인후 사용 가능합니다."
            }
        });
    } else {
        async.parallel({
            photoList: function (callback1) {
                if (typeof pictures != "undefined") {
                    fs.exists(folderPath, function (exists) {
                        if (exists) {
                            logger.debug(' 존재 하는 디렉토리입니다.');
                            var count = 0;
                            async.each(arr, function (file, callback1) {
                                var count = arr.indexOf(file);
                                console.log('file name', file.name);
                                var oldPath = './' + file.path.replace(/\\/gi, '/');
                                var newPath = folderPath + '/' + file.name + '_' + (index++) + '.' + file.extension;
                                fs.rename(oldPath, newPath, function (err) {
                                    if (err) {
                                        callback1(err);
                                    } else {
                                        pool.getConnection(function (err, conn) {
                                            if (err) {
                                                common.dbError(err, "사진 업로드중");
                                                return;
                                            }
                                            var thumbPath = folderPath + '/' + file.name + '_' + (index++) + '-thumbnail' + '.' + file.extension;
                                            var imgPath = newPath.replace('/home/ubuntu/projects/test2/public', '');
                                            easyimg.resize({
                                                src: newPath, dst: thumbPath, // 절대 경로 쓸것
                                                width: 242, height: 242,
                                                x: 0, y: 0
                                            }).then(function (file) {
                                                console.log('file', file);
                                            }, function (err) {
                                                console.log('err thumb', err);
                                            });
                                            var thumbnailPath = thumbPath.replace('/home/ubuntu/projects/test2/public', '');
                                            var sql = "insert into Company_photo (Company_Num, Photo_Path, Thumbnail) values (?,?,?)";
                                            conn.query(sql, [cnum, imgPath, thumbnailPath], function (err) {
                                                if (err) {
                                                    console.error('sql error');
                                                    common.dbExit(err, conn, "사진 insert중");
                                                }
                                                else {
                                                    console.log('success upload', thumbnailPath);
                                                    callback1(null, '1');
                                                    conn.release();
                                                }
                                            });
                                        });
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
                                    return;
                                } else {
                                    console.log('callback1');
                                    callback1(null, "1");
                                }
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
                                    logger.debug('존재 하지 않는 디렉토리 입니다.');
                                    async.each(arr, function (file, callback1) {
                                            var count = arr.indexOf(file);
                                            console.log('file aaa', file);
                                            var oldPath = './' + file.path.replace(/\\/gi, '/');
                                            var newPath = folderPath + '/' + file.name + '_' + (index++) + '.' + file.extension;
                                            console.log('exist newPath', newPath);
                                            fs.rename(oldPath, newPath, function (err) {
                                                if (err) {
                                                    callback1(err);
                                                } else {
                                                    pool.getConnection(function (err, conn) {
                                                        if (err) {
                                                            common.dbError(err, "사진 올리기중");
                                                            return;
                                                        }
                                                        var thumbPath = folderPath + '/' +file.name+ '_' + (index++) + '-thumbnail' + '.' + file.extension;
                                                        var imgPath = newPath.replace('/home/ubuntu/projects/test2/public', '');
                                                        easyimg.resize({
                                                            src: newPath, dst: thumbPath, // 절대 경로 쓸것
                                                            width: 242, height: 242,
                                                            x: 0, y: 0
                                                        }).then(function (file) {
                                                            console.log('file', file);
                                                        }, function (err) {
                                                            console.log('err thumb', err);
                                                        });
                                                        var thumbnailPath = thumbPath.replace('/home/ubuntu/projects/test2/public', '');
                                                        console.log('imgpath', imgPath);
                                                        var sql = "insert into Company_photo (Company_Num, Photo_Path, Thumbnail) values (?,?,?)";
                                                        conn.query(sql, [cnum, imgPath, thumbnailPath], function (err) {
                                                            if (err) {
                                                                console.error('sql error');
                                                                common.dbExit(err, conn, "사진 올리기중");
                                                                return;
                                                            }
                                                            else {
                                                                console.log('success exist folder');
                                                                callback1(null, '1');
                                                                conn.release();
                                                            }
                                                        });
                                                    });
                                                }
                                            });
                                        }, function (err) {
                                            if (err) {
                                                console.log('toa2');
                                                console.error('async error', err);
                                                res.json({
                                                    success: 0,
                                                    "result": {
                                                        "message": "upload fail"
                                                    }
                                                });
                                                return;
                                            } else {
                                                console.log('toa1');
                                                callback1(null);
                                            }
                                        } // 디렉토리 존재시 생성 후 사진 업로드
                                    );
                                }
                            });
                        }
                    });
                } else {
                    console.log('toa');
                    callback1(null);
                }
            },
            logo: function (callback2) {
                //var user_id = req.session.user_id;
                console.log('name');
                if (typeof cLogo != "undefined") {
                    var name = cLogo.name;
                    var srcPath = cLogo.path;
                    var idx = name.lastIndexOf('.');
                    var prefixName = name.substring(0, idx);
                    var publicPath = './public';
                    var folderPath = publicPath + '/images/uploads/logo';
                    var destImg = prefixName + '-logo';
                    var newPath = folderPath + '/' + Date.now() + '_' + destImg + '.' + cLogo.extension;
                    console.log('name');
                    if (!(cLogo instanceof Array)) {
                        thumnailFunc(cLogo);
                    }
                    function thumnailFunc(cLogo) {
                        console.log('destPath', newPath);
                        easyimg.resize({
                            src: srcPath, dst: newPath,
                            width: 189, height: 189,
                            x: 0, y: 0
                        }).then(function (file) {
                            console.log('file', file);
                        }, function (err) {
                            console.log('err', err);
                        });
                        return cLogo;
                    };
                    var temp = newPath.replace('./public', '');
                    console.log('logo path', temp);
                    var datas = [temp, cnum, user_id];

                    pool.getConnection(function (err, conn) {
                        if (err) {
                            common.dbError(err, "로고 변경중");
                            return;
                        }
                        var sql = "select count(Admin_Email) cnt from Company_Admin where Admin_Email = ?";
                        conn.query(sql, [datas[2]], function (err, row) {
                            if (err) console.error('err', err);
                            if (row[0].cnt == 0) {
                                if (err) console.error('err', err);
                            }
                            console.log('datas[0]', datas[0]);
                            console.log('Logo newPath',newPath);
                            var sql = "update Company_info set Company_Logo = ? where Company_Num = ?";
                            conn.query(sql, [datas[0], datas[1]], function (err, row) {
                                if (err) {
                                    console.error('err', err);
                                    common.dbExit(err, conn, "업체 로고 변경중");
                                }
                                //console.log('session', req.session.user_id);
                                if (row.affectedRows == 1) {
                                    var select_list = "SELECT Company_Logo FROM Company_info WHERE Company_Num = ?";
                                    var update_thumb = "update Company_info SET Company_Thumbnail = ?"
                                        + " where Company_Num = ?";
                                    conn.beginTransaction(function (err) {
                                        if (err) {
                                            common.dbExit(err, "썸네일 변경중", conn);
                                            return;
                                        }
                                        conn.query(select_list, [cnum], function (err, row) {
                                            if (err) {
                                                console.error('err', err);
                                            } else {
                                                console.log('row thumbnaul', row[0].Company_Logo);
                                                var thumbnail = row[0].Company_Logo;
                                                conn.query(update_thumb, [thumbnail, cnum], function (err,
                                                                                                      row) {
                                                    if (err) {
                                                        common.rollback(err, "썸네일 변경중", conn);
                                                        console.error('conn.query', err);
                                                    }
                                                    if (row.affectedRows == 1) {
                                                        console.log('thumbnail change complete');
                                                        callback2(null, "2"); // 콜백2
                                                        common.commit("uploadPhoto", conn);
                                                    }
                                                    //callback1(null,'1');
                                                    conn.release();
                                                });
                                            }
                                        });
                                    });
                                }
                                //conn.release();
                            });
                        });
                    });
                } else {
                    console.log('callback2');
                    callback2(null, "2");
                }
            },
            detail: function (callback3) {
                var datas = [owner, tel, phone, Homepage, Address, AvailableTime, introduce, user_id, cnum];
                console.log('detail params', owner, tel, phone, Homepage, Address, AvailableTime, introduce);
                var checkData = [datas[0], datas[2], datas[4]];
                if (!common.checkBlank(checkData)) {
                    res.json({
                        result: {
                            "message": 'Owner,Phone,Address은 필수 값입니다.'
                        }
                    });
                } else {
                    pool.getConnection(function (err, conn) {
                        if (err) {
                            common.dbError(err, "업체 상세 정보 수정 연결중");
                            return;
                        }
                        var sql = "select count(Admin_Email) cnt from Company_Admin where Admin_Email = ?";
                        conn.query(sql, [datas[7]], function (err, row) {
                            if (err) console.error('err', err);
                            if (row[0].cnt == 0) {
                                if (err) console.error('err', err);
                            } else {
                                var sql = "update Company_info set Owner=?,Tel = ?, Phone =?,  Homepage=?,"
                                    + " Address=?, AvailableTime=?, introduce =?"
                                    + " WHERE Company_Num = ?";
                                conn.query(sql, [datas[0], datas[1], datas[2], datas[3], datas[4], datas[5], datas[6], datas[8]], function (err,
                                                                                                                                            row) {
                                    if (err) {
                                        console.error('err', err);
                                        common.dbExit(err, conn, "업체 상세 정보 변경중");
                                        return;
                                    }
                                    if (row.affectedRows == 1) {
                                        console.log('detail 3');
                                        callback3(null, "3");
                                        conn.release();
                                    } else {
                                        callback3(null, "3");
                                    }
                                });
                            }
                        });
                    });
                }
                //}
                //else {
                //        console.log('callback3');
                //        callback3(null);
                //    }
            },
            deletePhoto: function (callback4) {
                //if (pnumList.length > 0) {
                if (typeof pnumList != "undefined") {
                    console.log('pnumList', pnum);
                    console.log('pnumList', pnum.length);
                    //if (typeof pnumList != "undefined") {
                    async.each(pnumList, function (iter, callback4) {
                        console.log('async start');
                        var count = pnumList.indexOf(iter);
                        console.log('count', pnumList);
                        var check_photo = "select Photo_Num from Company_photo where Photo_Num = '" + pnumList[count] + "'";
                        var delete_photo = "delete from Company_photo where Photo_Num = ?";
                        pool.getConnection(function (err, conn) {
                            if (err) {
                                console.error('err', err);
                                common.dbError(err, null, "사진 삭제 중");
                                return;
                            } else {
                                console.log('count1', pnumList);
                                conn.query(check_photo, function (err, row) {
                                    if (err) {
                                        console.error('err', err);
                                        common.dbExit(err, conn, "업체 사진 삭제중");
                                        return;
                                    } else {
                                        console.log('count2', pnumList);
                                        if (row.length > 0) {
                                            conn.query(delete_photo, [row[0].Photo_Num], function (err) {
                                                if (err) {
                                                    console.error('err', err);
                                                    common.dbExit(err, conn, "업체 사진 삭제중");
                                                    return;
                                                } else {
                                                    console.log('count3', pnumList);
                                                    callback4(null, "4");
                                                    common.dbExit(null, conn);
                                                }
                                            });
                                        } else {
                                            callback4(null, 4);
                                        }
                                    }
                                });
                            }
                        });
                    }, function (err) {
                        if (err) {
                            console.error('async error', err);
                            res.json({
                                success: 0,
                                "result": {
                                    "message": "delete fail"
                                }
                            });
                            return next(err);
                        } else {
                            callback4(null, "4");
                        }
                    });
                } else {
                    callback4(null, "4");
                }
            }
        }, function (err, results) {
            console.log('results', results);
            if (err) {
                console.error('err', err);
            } else {
                res.json({
                    success: 1,
                    result: {
                        message: "업체 변경 성공"
                    }
                });
            }
        });

    }
}
router.post('/photos/modi/:cnum', updateProfile);

module.exports = router;


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
