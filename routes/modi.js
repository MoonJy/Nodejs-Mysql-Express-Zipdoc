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
    console.log('picutres',pictures);
    //정보 수정 시작
    var owner = req.body.owner;
    var tel = req.body.tel;
    var phone = req.body.phone;
    var Homepage = req.body.Homepage;
    var Address = req.body.Address;
    var AvailableTime = req.body.AvailableTime;
    var introduce = req.body.introduce;
    var infoData = [owner, tel, phone, Homepage, Address, AvailableTime, introduce, user_id, cnum];

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
    //function isEmptyObject(obj) {
    //    if (JSON.stringify(obj) == '{}') {
    //        return 'check';
    //    }
    //    return Object.keys(obj).length === 0;
    //    if (obj == null) {
    //        return true;
    //    }
    //    if (typeof obj == "undefined") {
    //        return true;
    //    }
    //}
    //var test = isEmptyObject(pictures);
    //console.log('test',test);

    //var noFiles = isEmptyObject(req.files);
    //console.log('test', noFiles);

    /*
     1. 사진 올리기, 로고 수정
     2. 사진 올리기, 로고 보류
     3. 사진 보류, 로고 수정
     4. 사진 보류, 로고 보류
     5. 사진 삭제, 로고 수정
     6. 사진 삭제, 로고 보류
     + 정보 수정
     */

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
                console.log('2');
                if (typeof pictures != "undefined") {
                    console.log('picture', pictures);
                    console.log('pictureList', picturesList);
                    fs.exists(folderPath, function (exists) {
                        if (exists) {
                            logger.debug(' 존재 하는 디렉토리입니다.');
                            var count = 0;
                            async.each(arr, function (file, callback) {
                                var count = arr.indexOf(file);
                                console.log('file aaa', file);
                                var oldPath = './' + file.path.replace(/\\/gi, '/');
                                var newPath = folderPath + '/' + Date.now() + '_' + (index++) + '.' + file.extension;
                                //var imgPath = path.join(__dirname, '..','public',newPath);
                                console.log('newPath', newPath);
                                fs.rename(oldPath, newPath, function (err) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        pool.getConnection(function (err, conn) {
                                            var thumbPath = folderPath + '/' + Date.now() + '_' + (index++) + '-thumbnail' + '.' + file.extension;
                                            var imgPath = newPath.replace('/home/ubuntu/projects/test2/public', '');
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
                                            console.log('imgpath', imgPath);
                                            var sql = "insert into Company_photo (Company_Num, Photo_Path, Thumbnail) values (?,?,?)";
                                            conn.query(sql, [cnum, imgPath, thumbnailPath], function (err) {
                                                if (err) console.error('sql error');
                                                else {
                                                    console.log('count', count);
                                                    var select_list = "SELECT Thumbnail FROM Company_photo WHERE Company_Num = ?"
                                                        + " ORDER BY UpdateTime DESC LIMIT 1";
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
                                                                console.log(row[0].Thumbnail);
                                                                var thumbnail = row[0].Thumbnail;
                                                                conn.query(update_thumb, [thumbnail, cnum], function (err,
                                                                                                                      row) {
                                                                    if (err) {
                                                                        common.rollback(err, "썸네일 변경중", conn);
                                                                        console.error('conn.query', err);
                                                                    }
                                                                    if (row.affectedRows == 1) {
                                                                        console.log('affectedRows');
                                                                        callback(null,1);
                                                                        common.commit("uploadPhoto", conn);
                                                                    }
                                                                    conn.release();
                                                                });
                                                            }
                                                        });
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
                                            //var imgPath = path.join(__dirname, '..','public',newPath);
                                            console.log('newPath', newPath);
                                            fs.rename(oldPath, newPath, function (err) {
                                                if (err) {
                                                    callback(err);
                                                } else {
                                                    pool.getConnection(function (err, conn) {
                                                        var thumbPath = folderPath + '/' + Date.now() + '_' + (index++) + '-thumbnail' + '.' + file.extension;
                                                        var imgPath = newPath.replace('/home/ubuntu/projects/test2/public', '');
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
                                                        console.log('imgpath', imgPath);
                                                        var sql = "insert into Company_photo (Company_Num, Photo_Path, Thumbnail) values (?,?,?)";
                                                        conn.query(sql, [cnum, imgPath, thumbnailPath], function (err) {
                                                            if (err) console.error('sql error');
                                                            else {
                                                                var select_list = "SELECT Thumbnail FROM Company_photo WHERE Company_Num = ?"
                                                                    + " ORDER BY UpdateTime DESC LIMIT 1";
                                                                var update_thumb = "update Company_info SET Company_Thumbnail = ?"
                                                                    + " where Company_Num = ?";
                                                                conn.beginTransaction(function (err) {
                                                                    if (err) {
                                                                        common.dbExit(err, "썸네일 변경중", conn);
                                                                        return;
                                                                    }
                                                                    conn.query(select_list, [cnum], function (err,
                                                                                                              row) {
                                                                        if (err) {
                                                                            console.error('err', err);
                                                                        } else {
                                                                            console.log(row[0].Thumbnail);
                                                                            var thumbnail = row[0].Thumbnail;
                                                                            conn.query(update_thumb, [thumbnail, cnum], function (err,
                                                                                                                                  row) {
                                                                                if (err) {
                                                                                    console.log('toa5');
                                                                                    common.rollback(err, "썸네일 변경중", conn);
                                                                                    console.error('conn.query', err);
                                                                                }
                                                                                if (row.affectedRows == 1) {
                                                                                    console.log('toa4');
                                                                                    console.log('affectedRows');
                                                                                    callback(null,1);
                                                                                    common.commit("uploadPhoto", conn);
                                                                                }
                                                                                conn.release();
                                                                            });
                                                                        }
                                                                    });
                                                                });
                                                            }

                                                        });
                                                    });
                                                    console.log('toa3');
                                                    callback();
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
                                            } else {
                                                console.log('toa1');
                                                callback(null);
                                            }
                                        }
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
                        easyimg.thumbnail({
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
                    //if (Object.keys(cLogo).length != 0) {

                    pool.getConnection(function (err, conn) {
                        var sql = "select count(Admin_Email) cnt from Company_Admin where Admin_Email = ?";
                        conn.query(sql, [datas[2]], function (err, row) {
                            if (err) console.error('err', err);
                            if (row[0].cnt == 0) {
                                if (err) console.error('err', err);
                            }
                            console.log('datas[0]', datas[0]);
                            var sql = "update Company_info set Company_Logo = ? where Company_Num = ?";
                            conn.query(sql, [datas[0], datas[1]], function (err, row) {
                                if (err) {
                                    console.error('err', err);
                                }
                                console.log('row', row);
                                //console.log('session', req.session.user_id);
                                if (row.affectedRows == 1) {
                                    callback2(null,2);
                                }
                                conn.release();
                            });
                        });
                    });
                } else {
                    console.log('callback2');
                    callback2(null);
                }
            },
            detail: function (callback3) {
                var datas = [owner, tel, phone, Homepage, Address, AvailableTime, introduce, user_id, cnum];
                console.log('detail params',owner, tel, phone, Homepage, Address, AvailableTime, introduce);
                var checkData = [datas[0], datas[2], datas[4]];
                    if (!common.checkBlank(checkData)) {
                        res.json({
                            result: {
                                "message": 'Owner,Phone,Address은 필수 값입니다.'
                            }
                        });
                    }
                    pool.getConnection(function (err, conn) {
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
                                        //common.rollback(err, "companyModify", conn);
                                    }
                                    console.log('row', row);
                                    if (row.affectedRows == 1) {
                                        //common.commit("companyModify", conn);
                                        //callback(success);
                                        callback3(null,3);
                                    }
                                    conn.release();
                                });
                            }
                        });
                    });
                //}
            //else {
            //        console.log('callback3');
            //        callback3(null);
            //    }
            },
            deletePhoto: function (callback4) {
                if (pnum.length > 0) {
                console.log('pnumList',pnum);
                console.log('pnumList',pnum.length);
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
                            } else {
                                conn.query(check_photo, function (err, row) {
                                    if (err) {
                                        console.error('err', err);
                                    } else {
                                        console.log('pnumList[count]', pnumList[count]);
                                        console.log('select success');
                                        if (row.length>0) {
                                            console.log('row',row);
                                            conn.query(delete_photo, [row[0].Photo_Num], function (err) {
                                                console.log('row[0].PhotoNum', row[0].Photo_Num);
                                                if (err) {
                                                    console.error('err', err);
                                                } else {
                                                    console.log('delete_query');
                                                    callback4(null,4);
                                                    common.dbExit(null, conn);
                                                }
                                            });
                                        }else{
                                            callback4(null);
                                        }
                                    }
                                });
                                //callback4(null);
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
                        } else {
                            //callback4(null);
                            callback4(null);
                        }
                    });
                } else {
                    callback4(null);
                }
            }
        }, function (err, results) {
            console.log('results', results);
            if (err) {
                console.error('err', err);
            } else {
                res.json({
                    result: {
                        message: "좆커버그"
                    }
                });
                //callback(results);
            }
        });

    }
}
router.post('/test/:cnum', updateProfile); // 프로필수정하기 라우터

/*

 */
/*if (arr) { // 사진이 있을때
 console.log('arr', arr);
 if (cLogo) { // 사진만 업로드하고 로고도 업로드 할때
 console.log('cLogo', cLogo);
 updateCompany(pictures, cnum); // 사진 업로드
 modifyLogo(cnum, cLogo);
 console.log('사진만 업로드하고 로고도 업로드 할때');
 } else { // 사진만 업로드하고 로고는 업로드 안할 때
 console.log('cLogo no');
 updateCompany(pictures, cnum);
 }
 } else { //사진이 없을때
 if (cLogo) {//사진업로드 안하고 로고 업로드 할때
 modifyLogo(cnum, cLogo);
 } else if (noFiles == 'noObjects') { // 사진 업로드 안하고 로고 업로드 안할 때
 companyModify(cnum, owner, tel, phone, Homepage, Address, AvailableTime, introduce);
 }
 }
 if (pnumList.length > 0) { // 사진 번호가 왔을 때
 if (cLogo) {// 사진 삭제하고 로고도 업로드 할때
 deletePhoto(cnum, pnum);
 modifyLogo(cnum, cLogo);
 } else { // 사진 삭제하고 로고 업로드 안할때
 modifyLogo(cnum, cLogo);
 }
 }*/
/*
 업체 사진 올리기
 */
function updateCompany(req, res, next) {
    //var comNum = req.params.comNum;
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
    //var folderPath = publicPath + '/images/uploads/' + user_id;
    var folderPath = path.join(__dirname, '..', 'public', 'images', 'uploads', user_id);

    console.log(folderPath);
    if (!req.session.user_id) {
        res.json({
            result: {message: "업체 관계자 로그인 후 사용 가능합니다."}
        });
    } else {
        fs.exists(folderPath, function (exists) {
            if (exists) {
                logger.debug(' 존재 하는 디렉토리입니다.');
                var count = 0;
                async.each(arr, function (file, callback) {
                    var count = arr.indexOf(file);
                    console.log('file aaa', file);
                    var oldPath = './' + file.path.replace(/\\/gi, '/');
                    var newPath = folderPath + '/' + Date.now() + '_' + (index++) + '.' + file.extension;
                    //var imgPath = path.join(__dirname, '..','public',newPath);
                    console.log('newPath', newPath);
                    fs.rename(oldPath, newPath, function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            pool.getConnection(function (err, conn) {
                                var thumbPath = folderPath + '/' + Date.now() + '_' + (index++) + '-thumbnail' + '.' + file.extension;
                                var imgPath = newPath.replace('/home/ubuntu/projects/test2/public', '');
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
                                console.log('imgpath', imgPath);
                                var sql = "insert into Company_photo (Company_Num, Photo_Path, Thumbnail) values (?,?,?)";
                                conn.query(sql, [cnum, imgPath, thumbnailPath], function (err) {
                                    if (err) console.error('sql error');
                                    else {
                                        console.log('count', count);
                                        var select_list = "SELECT Thumbnail FROM Company_photo WHERE Company_Num = ?"
                                            + " ORDER BY UpdateTime DESC LIMIT 1";
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
                                                    console.log(row[0].Thumbnail);
                                                    var thumbnail = row[0].Thumbnail;
                                                    conn.query(update_thumb, [thumbnail, cnum], function (err,
                                                                                                          row) {
                                                        if (err) {
                                                            common.rollback(err, "썸네일 변경중", conn);
                                                            console.error('conn.query', err);
                                                        }
                                                        if (row.affectedRows == 1) {
                                                            console.log('affectedRows');
                                                            common.commit("uploadPhoto", conn);
                                                        }
                                                        conn.release();
                                                    });
                                                }
                                            });
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
                                //var imgPath = path.join(__dirname, '..','public',newPath);
                                console.log('newPath', newPath);
                                fs.rename(oldPath, newPath, function (err) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        pool.getConnection(function (err, conn) {
                                            var thumbPath = folderPath + '/' + Date.now() + '_' + (index++) + '-thumbnail' + '.' + file.extension;
                                            var imgPath = newPath.replace('/home/ubuntu/projects/test2/public', '');
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
                                            console.log('imgpath', imgPath);
                                            var sql = "insert into Company_photo (Company_Num, Photo_Path, Thumbnail) values (?,?,?)";
                                            conn.query(sql, [cnum, imgPath, thumbnailPath], function (err) {
                                                if (err) console.error('sql error');
                                                else {
                                                    var select_list = "SELECT Thumbnail FROM Company_photo WHERE Company_Num = ?"
                                                        + " ORDER BY UpdateTime DESC LIMIT 1";
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
                                                                console.log(row[0].Thumbnail);
                                                                var thumbnail = row[0].Thumbnail;
                                                                conn.query(update_thumb, [thumbnail, cnum], function (err,
                                                                                                                      row) {
                                                                    if (err) {
                                                                        common.rollback(err, "썸네일 변경중", conn);
                                                                        console.error('conn.query', err);
                                                                    }
                                                                    if (row.affectedRows == 1) {
                                                                        console.log('affectedRows');
                                                                        common.commit("uploadPhoto", conn);
                                                                    }
                                                                    conn.release();
                                                                });
                                                            }
                                                        });
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
                            }
                        );
                    }
                });
            }
        });
    }
}

/*
 업체 사진 삭제하기
 */
var deletePhoto = function (cnum, pnum) {
    var pnumList = [];
    if (pnum instanceof Array) {
        pnumList = pnum.map(function (x) {
            return parseInt(x, 10);
        });
    } else {
        pnum = parseInt(pnum);
        pnumList.push(pnum);
    }

    if (!req.session.user_id) {
        res.json({
            result: {
                "message": "세션이 만료 되었습니다."
            }
        });
    } else {
        if (!common.checkNull(pnum)) {
            res.json({
                result: {
                    "message": "입력 값을 확인하세요"
                }
            });
        } else {
            async.each(pnumList, function (iter, callback) {
                console.log('async start');
                var count = pnumList.indexOf(iter);
                console.log('count', pnumList);
                var check_photo = "select Photo_Num from Company_photo where Photo_Num = '" + pnumList[count] + "'";
                var delete_photo = "delete from Company_photo where Photo_Num = ?";
                pool.getConnection(function (err, conn) {
                    if (err) {
                        console.error('err', err);
                        common.dbError(err, null, "사진 삭제 중");
                    } else {
                        conn.query(check_photo, function (err, row) {
                            if (err) {
                                console.error('err', err);
                            } else {
                                console.log('pnumList[count]', pnumList[count]);
                                console.log('select success');
                                if (row.length) {
                                    conn.query(delete_photo, [row[0].Photo_Num], function (err) {
                                        console.log('row[0].PhotoNum', row[0].Photo_Num);
                                        if (err) {
                                            console.error('err', err);
                                        } else {
                                            console.log('delete_query');
                                            common.dbExit(null, conn);
                                        }
                                    });
                                }
                            }
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
                            "message": "delete fail"
                        }
                    });
                } else {
                    res.json({
                        success: 1,
                        "result": {
                            "message": "thumbnail update success !"
                        }
                    });

                }
            });
        }
    }
}

/*
 업체 정보 수정
 */
//router.post('/modify/:cnum', function (req, res, next) {
var companyModify = function (cnum, owner, tel, phone, Homepage, Address, AvailableTime, introduce) {
    var id = req.session.user_id;
    var datas = [owner, tel, phone, Homepage, Address, AvailableTime, introduce, id, cnum];
    var checkData = [datas[0], datas[2], datas[4]];

    if (!common.checkNull(checkData) || !common.checkBlank(checkData)) {
        res.json({
            result: {
                "message": 'Owner,Phone,Address은 필수 값입니다.'
            }
        });
    }
    if (!req.session.user_id) {
        res.json({
            result: {
                "message": "세션이 만료 되었습니다."
            }
        });
    } else {
        pool.getConnection(function (err, conn) {
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
                            //common.rollback(err, "companyModify", conn);
                        }
                        console.log('row', row);
                        if (row.affectedRows == 1) {
                            //common.commit("companyModify", conn);
                            //callback(success);
                            res.json({
                                success: 1,
                                result: {
                                    message: "haha"
                                }
                            });
                        }
                        conn.release();
                    });
                }
            });
        });
    }
}

/*
 업체 로고 수정
 로고를 수정해주자!
 */
var modifyLogo = function (cnum, cLogo) {
    var user_id = req.session.user_id;
    var name = cLogo.name;
    var srcPath = cLogo.path;
    var idx = name.lastIndexOf('.');
    var prefixName = name.substring(0, idx);
    var publicPath = './public';
    var folderPath = publicPath + '/images/uploads/logo';
    var destImg = prefixName + '-logo';
    var newPath = folderPath + '/' + Date.now() + '_' + destImg + '.' + cLogo.extension;

    if (!(cLogo instanceof Array)) {
        thumnailFunc(cLogo);
    }
    function thumnailFunc(cLogo) {
        console.log('destPath', newPath);
        easyimg.thumbnail({
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
    if (!common.checkNull(datas) && !common.checkBlank(datas)) {
        res.json({
            result: {
                "message": "입력 값을 확인해주세요."
            }
        });
    } else {
        pool.getConnection(function (err, conn) {
            var sql = "select count(Admin_Email) cnt from Company_Admin where Admin_Email = ?";
            conn.query(sql, [datas[2]], function (err, row) {
                if (err) console.error('err', err);
                if (row[0].cnt == 0) {
                    if (err) console.error('err', err);
                }
                console.log('datas[0]', datas[0]);
                var sql = "update Company_info set Company_Logo = ? where Company_Num = ?";
                conn.query(sql, [datas[0], datas[1]], function (err, row) {
                    if (err) {
                        console.error('err', err);
                    }
                    console.log('row', row);
                    //console.log('session', req.session.user_id);
                    if (row.affectedRows == 1) {
                        res.json({
                            success: 1,
                            result: {
                                message: "logo success"
                            }
                        });
                    }
                    conn.release();
                });
            });
        });
    }
}
//});
module.exports = router;

