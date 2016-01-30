var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);
var async = require('async');
var common = require('../lib/common');
var easyimg = require('easyimage');
/*
 이벤트 리스트 보기 프로토콜
 ver 1.0
 */
exports.list = function (callback) {
    pool.getConnection(function (err, conn) {
        if (err) console.error('err', err);
        var sql = "select e.EventNum,concat('" + common.serverHost + "',e.Event_photo_thumb) Event_photo_thumb,e.Event_Content, e.Event_Title from EventList e";
        conn.query(sql, function (err, rows) {
            if (err) console.error('err', err);
            var success = false;
            console.log('rows', rows);
            if (err) {
                success = false;
                console.log('err', err);
                conn.release();
                callback(success);
            } else {
                conn.release();
                callback(rows);
            }
        });
    });
};
/*
 이벤트참여 프로토콜
 DB
 ver 1.0
 */
exports.join = function (datas, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('err', err);
        } else {
            var sql = "select count(*) cnt"
                + " from EventUser e"
                + " where e.Event_User_Phone = ?";
            conn.query(sql, datas[2], function (err, row) {
                if (err) {
                    console.log(err);
                } else {
                    var success = false;
                    if (row[0].cnt == 1) {
                        conn.release();
                        callback(success);
                    } else if (row[0].cnt == 0) {
                        var sql = "insert into EventUser(EventNum,Event_User_Name,Event_User_Phone,UserAvailableTime,RequestContent) values(?,?,?,?,?)";
                        conn.query(sql, datas, function (err, row) {
                            if (err) {
                                console.log('err', err);
                            }
                            console.log('row', row);
                            var success = false;
                            if (row.affectedRows == 1) {
                                success = true;
                            }
                            conn.release();
                            callback(success);
                        });
                    }
                }
            });
        }
    });
};

/*
 이벤트 상세보기 프로토콜
 DB
 ver 1.0
 */
exports.eventInfo = function (data, callback) {
    pool.getConnection(function (err, conn) {
        var sel_sql = "select e.EventNum, e.Event_Content, e.Event_Title from EventList e where EventNum = ?";
        var event_sql = "select concat('" + common.serverHost + "',event_photo_path) event_photo_path from Event_Photo where EventNum = ?";
        console.log('db data', data);
        if (err) console.error('err', err);
        else {
            async.parallel({
                    detail: function (callback) {
                        conn.query(sel_sql, data, function (err, rows) {
                            if (err) {
                                callback(err);
                            } else {
                                if (rows.length) {
                                    console.log('detail callback');
                                    callback(null, rows[0]);
                                }
                            }
                        });
                    },
                    company_photo: function (callback) {
                        conn.query(event_sql, data, function (err, rows) {
                            if (err) {
                                console.error('err callback', err);
                                callback(err);
                            } else {
                                if (rows) {
                                    console.log('photo callback');
                                    callback(null, rows);
                                }else{
                                    callback(null);
                                }
                            }
                        });
                    }
                },
                function (err, results) {
                    callback(results);
                });
        }
    });
}

/*
 이벤트 등록하기 ( 관리 )
 fs.rename 해주기
 */
exports.register = function (datas, callback) {
    //var folderPath = path.join(__dirname, '..', 'public', 'images', 'uploads', datas[4]);
    var name = datas[1].name;
    var srcPath = datas[1].path;
    var idx = name.lastIndexOf('.');
    var prefixName = name.substring(0, idx);
    var publicPath = './public';
    var folderPath = publicPath + '/images/uploads/event';
    var destImg = prefixName + '-eventThumbnail';
    var thumbPath = folderPath + '/' + Date.now() + '_' + destImg + '.' + datas[1].extension;
    easyimg.thumbnail({
        src: srcPath, dst: thumbPath, // 절대 경로 쓸것
        width: 242, height: 242,
        x: 0, y: 0
    }).then(function (file) {
        console.log('file', file);
    }, function (err) {
        console.log('err thumb', err);
    });
    console.log('thumbPath', thumbPath);
    var thumbnailPath = thumbPath.replace('/home/ubuntu/projects/test2/public', '');
    console.log('thumbnailPath',thumbnailPath);
    pool.getConnection(function (err, conn) {
        if (err) {
            common.dbError(err,"이벤트 등록 중");
            return;
        } else {
            var event_register = "insert EventList (Company_Num,Event_Photo_thumb,Event_Content,Event_Title)"
                + " values (?,'"+thumbnailPath+"',?,?)";
            console.log('sql check', event_register);
            conn.query(event_register, [datas[0],datas[2],datas[3]], function (err, row) {
                if (err) {
                    console.log('query err', err);
                    common.dbError(err,"이벤트 등록 중");
                    return;
                } else {
                    var success = false;
                    if (row.affectedRows == 1) {
                        success = true;
                        callback(success);
                    }
                    callback(success);
                    common.dbExit(null, conn);
                }
            });
        }
    });
}

/*
 이벤트 삭제하기 ( 관리 )
 */

var check_list = " select count(*) cnt from EventList where EventNum = ?";
var delete_list = "update EventList set Event_Flag = 'N' where EventNum = ?";

exports.unregister = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            common.dbError(err,"회원가입중");
            return;
        } else {
            async.waterfall([
                function checkEventList(callback) {
                    conn.query(check_list, data, function (err, row) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        if (row[0].cnt == 1) {
                            callback(null);
                        }else{
                            callback(new Error("이벤트가 존재하지 않습니다."));
                        }
                    });
                },
                function deleteEventList(callback) {
                    conn.query(delete_list, data, function(err, row){
                        if(err){
                            callback(err);
                            return;
                        }else{
                            if(row.affectedRows==1){
                                callback(null);
                            }else{
                                callback(new Error("삭제중 에러발생"));
                            }
                        }
                    });
                }
            ], function (err, result) {
                    if(err){
                        console.error('result err',err);
                    }else{
                        callback(result);
                    }
            });
        }
    });
}