/*
비트버킷 테스트
 */

var express = require('express');
var router = express.Router();
var db_users = require('../models/db_users');
var common = require('../lib/common');
var async = require('async');
var logger = require('../config/logger');
var dbconfig = require('../models/db_config');
var mysql = require('mysql');
var schedule = require('node-schedule');
var pool = mysql.createPool(dbconfig); // pool 만들기

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

var withdrawAdmin = function (req, res, next) {
    var adnum = req.params.adnum;
    adnum = parseInt(adnum);
    var data = [adnum];

    db_users.withdraw(data, function (row) {
        if (row.length) {
            res.json({
                success: 1,
                result: {
                    message: "탈퇴 성공"
                }
            });
        } else {
            res.json({
                success: 0,
                result: {
                    message: "탈퇴 실패"
                }
            });
        }
    });
}
router.get('/withdraw/:adnum', withdrawAdmin);

/*
 위경도 변환
 */
var request = require('request');
var parseString = require('xml2js').parseString;
var schedule = require('node-schedule');
var cronStyle = '* * * * *'; // 매분마다 실행

function updateLatLon(req, res, next) {
    //var startNum = req.body.startNum;
    var StartNum = req.body.StartNum;
    var EndNum = req.body.EndNum;
    StartNum = parseInt(StartNum);
    EndNum = parseInt(EndNum);
    var arr = [];
    for (var i = StartNum; i < EndNum; i++) {
        arr.push(i);
    }
    console.log('arr', arr);

    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err', err);
        } else {
            async.eachSeries(arr, function (iter, callback) {
                //setTimeout(function () {
                var count = arr.indexOf(iter);
                //var sql =
                //console.log('sql select', sql);
                //console.log('arr[count]', arr[count]);
                conn.query("select Address from Company_info where Company_Num = " + arr[count] + "", function (err,
                                                                                                                rows) {
                    if (err) {
                        console.error('err', err);
                    } else {
                        if (rows) {
                            console.log('rows', rows);
                            console.log('rows address', rows[0].Address);
                            var options = {
                                url: 'http://openapi.map.naver.com/api/geocode.php',
                                method: 'GET',
                                qs: {
                                    'key': 'eff4e53c81471a092d829a3e637f5957', 'query': rows[0].Address,
                                    'encording': 'utf-8', 'coord': 'latlng'
                                }
                            }

                            request(options, function (error, response, body) {
                                if (error) {
                                    console.error('err', error);
                                    return;
                                }
                                if (!error && response.statusCode == 200) {
                                    parseString(body, function (err, result) {
                                        if(result.geocode.total!='0'){
                                            console.log('total',result.geocode.total);
                                        console.log(result);
                                        var x = result.geocode.item[0].point[0].x[0];
                                        var y = result.geocode.item[0].point[0].y[0];
                                        var sql = "update Company_info set Lon =?,Lat =? where Company_Num = " + arr[count] + "";
                                        conn.query(sql, [x, y], function (err, row) {
                                            if (err) {
                                                console.error('err', err);
                                            } else {
                                                //iter++;
                                                console.log('x,y', x + ' ' + y);
                                                console.log('count', count);
                                                callback();
                                                //conn.release();
                                            }
                                        });
                                        }
                                        else if(result.geocode.total=='0'){
                                            console.log('end');
                                            callback();
                                        }
                                    });
                                }
                            });
                        } else {

                        }
                    }
                }); //conn end
                //}, 1000);
            }, function (err) { // each end
                if (err) {
                    console.error('err', err);
                    res.json({
                        result: "async error"
                    });
                } else {
                    res.json({
                       result:{
                           message:"끝"
                       }
                    });
                }
            });// each err
        }
    });
}
router.post('/update', updateLatLon); // 업체 위 경도 변환

module.exports = router;
