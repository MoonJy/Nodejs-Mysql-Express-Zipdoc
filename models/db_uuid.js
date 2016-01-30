var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);
var common = require('../lib/common');

/*
 uuid 전송
 DB conn
 ver 0.5
 */
/*exports.send_uuid = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('err', err);
        } else {
            var sql = "select count(Member_UUID) cnt from Member m"
                + " where Member_UUID = ?";
            conn.query(sql, data, function (err, row) {
                if (err) {
                    console.error('err', err);
                } else {
                    var success = false;
                    if (row[0].cnt == 1) {
                        console.log('data', data);
                        console.log('row[0]cnt', row[0].cnt);
                        conn.release();
                        callback(success);
                    } else {
                        var sql = "insert into Member (Member_UUID) values (?)";
                        conn.query(sql, data, function (err, row) {
                            console.log('data', data);
                            if (err) console.error('err', err);
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
};*/


/*
 push test
 */

/*
 uuid 전송
 DB conn
 ver 0.5
 */
exports.send_uuid = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err connection', err);
            common.dbError(err, null, "uuid를 전송하는중");
        } else {
            var sql = "select count(Member_UUID) cnt from Member m"
                + " where Member_UUID = ?";
            conn.query(sql, [data[0]], function (err, row) {
                if (err) {
                    console.error('err', err);
                } else {
                    if (row[0].cnt== 0) {
                        var insert_sql = "insert into Member (Reg_id,Member_UUID) values (?,?)";
                        conn.query(insert_sql, [data[1],data[0]], function (err, row) {
                            if (err) console.log('err', err);
                            var success = false;
                            if (row.affectedRows == 1) {
                                success = true;
                                callback(success);
                            } else {
                                conn.release();
                                callback(success);
                            }
                        });
                    } else {
                        var update_sql = "update Member set Reg_id =? where Member_UUid = ?";
                        conn.query(update_sql, [data[1],data[0]], function (err, row) {
                            if (err) console.error('err', err);
                            console.log('row', row);
                            var success = false;
                            if (row.affectedRows == 1) {
                                success = true;
                                //callback(success);
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

exports.reg_id = function(callback){
    pool.getConnection(function(err,conn){
       if(err) console.error('err pool',err);
        var sql = "select Reg_id from Member";
        conn.query(sql,function(err,rows){
           if(err) console.error('err query',err);
            if(rows){
                console.log('rows.Reg_id',rows[0].Reg_id);
                conn.release();
                callback(rows);
            }else{
                conn.release();
            }
        });
    });
}
