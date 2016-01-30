var express = require('express');
var router = express.Router();
var db_coupon = require('../models/db_coupon');
var common = require('../lib/common');
var async = require('async');
var logger = require('../config/logger');
var dbconfig = require('../models/db_config');
var mysql = require('mysql');
var schedule = require('node-schedule');
var pool = mysql.createPool(dbconfig); // pool 만들기

/*
쿠폰등록 ( 관리 )
 */
var registerCoupon = function (req, res, next) {
    var coupon_content = req.body.coupon_content;
    var coupon_startTime = req.body.coupon_startTime;
    var coupon_endTime = req.body.coupon_EndTime;

    var data = [coupon_content];

    db_coupon.register(data, function (row) {
        if(row){
            res.json({
               success:1,
                result:{
                    "message":"쿠폰이 등록되었습니다."
                }
            });
        }else{
            res.json({
                success:0,
                result:{
                    "message":"쿠폰 등록이 실패하였습니다."
                }
            });
        }
    });

}
router.post('/register', registerCoupon);

var updateCoupon = function(req,res,next){
    var counum = req.params.counum;
    counum = parseInt(counum);
    var couponContent = req.body.couponContent;
    var data = [counum, couponContent];

    db_coupon.updateCoupon(data,function(success){
        if(success){
            res.json({
               success:1,
                result:{
                    "message":"쿠폰이 수정되었습니다."
                }
            });
        }   else{
            res.json({
                success:0,
                result:{
                    "message":"쿠폰 수정이 실패 하였습니다."
                }
            });
        }
    });
}
router.post('/update/:counum', updateCoupon);

/*
 쿠폰 삭제 ( 관리 )
 */
var unregisterCoupon = function (req, res, next) {
    var counum = req.params.counum;
    counum = parseInt(counum);
    console.log('counum', counum);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err connetion', err);
            res.json({
                result: {
                    "message": "db 접속 에러"
                }
            });
            return;
        } else {
            console.log('select start ');
            var sql = "select DATE_FORMAT(c.Coupon_EndTime, '%Y-%m-%d') time from Coupon c where c.Coupon_Num = ?";
            conn.query(sql, [counum], function (err, row) {
                if (err) {
                    console.log('query err', err);
                    res.json({
                        result: {
                            "message": "셀렉트 쿼리 에러"
                        }
                    });
                } else {
                    if (row[0]) {
                        var date = new Date();
                        date = row[0].time; // 0이 1월 + 1 해주자
                        console.log('date', date);
                        var start_schedule = schedule.scheduleJob(date, function () {
                            var expire_coupon = "update Coupon set Coupon_Flag = 'N' where " + date + " < CURRENT_DATE()"
                                + " and Coupon_Num = ?";
                            conn.query(expire_coupon, [counum], function (err, row) {
                                if (err) {
                                    console.log('update err', err);
                                } else {
                                    res.json({
                                        result: {
                                            message: "success"
                                        }
                                    });
                                }
                            });
                        });

                    } else {

                    }
                }
            });
        }
    });
};
router.post('/unregister/:counum', unregisterCoupon);


module.exports = router;