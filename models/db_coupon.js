var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);
var async = require('async');
var common = require('../lib/common');
var schedule = require('node-schedule');

/*
 쿠폰 등록하기 (관리)
 */
exports.register = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err', err);
            common.dbError(err, "쿠폰 등록중");
        } else {
            var coupon_reg_sql = "insert Coupon (Coupon_Content, Coupon_StartTime, Coupon_EndTime) values(?, now(), now() + INTERVAL 1 DAY)";
            conn.query(coupon_reg_sql, data, function (err, row) {
                if (err) {
                    console.error('err', err);
                } else {
                    var success = false;
                    if (row.affectedRows == 1) {
                        success = true;
                        //callback(success);
                    }
                    callback(success);
                    common.dbExit(null, conn);
                }
            });
        }
    });
}

/*
 쿠폰 수정 ( 관리 )
 */

var select_coupon = "select count(Coupon_Num) cnt from Coupon where Coupon_Num = ?";
var update_coupon = "update Coupon set Coupon_Content = ? where Coupon_Num = ?";

exports.updateCoupon = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            common.dbError(err, null, "쿠폰 수정중");
            return;
        } else {
            conn.query(select_coupon, [data[0]], function (err, row) {
                if (err) {
                    console.log(data[0]);
                    console.error('err select', err);
                } else {
                    var success = false;
                    if (row[0].cnt == 1) {
                        conn.query(update_coupon, [data[1], data[0]], function (err, row) {
                            if (err) {
                                console.error('err update', err);
                            } else {
                                if (row.affectedRows == 1) {
                                    console.log('affected');
                                    success = true;
                                    //callback(success);
                                } else {
                                    callback(success);
                                    conn.release();
                                }
                            }
                        });
                    } else {
                        callback(success);
                        conn.release();
                    }
                }
            });
        }
    });
}

/*
 쿠폰 삭제 --------- 노드 스케줄러
 */
/*var cronStyle = '0 0 * * * *'; // 에브리 미드나잇마다 실행

 var j = schedule.scheduleJob(cronStyle, function(){
 pool.getConnection(function(err,conn){
 if(err) console.error('err',err);
 else{
 var sql = "update Coupon set Coupon_Flag = 'N' where Coupon_EndTime < CURRENT_TIMESTAMP()";
 console.log('start');
 conn.query(sql, function(err,row){
 if(err) console.error('err',err);
 });
 }
 });
 });*/


