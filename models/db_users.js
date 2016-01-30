var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);
var async = require('async');
var common = require('../lib/common');
var schedule = require('node-schedule');


var select_sql = "select count(Admin_Num) cnt from Company_Admin where Admin_Num = ?";
var withdraw_sql = "update Company_Admin set Admin_Flag = 'N' where Admin_Num = ?";
exports.withdraw = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err', err);
        } else {
            conn.query(select_sql, data, function (err, row) {
                if (err) {
                    console.error('err', err);
                } else {
                    var success = false;
                    if (row[0].cnt == 1) {
                        conn.query(withdraw_sql, data, function (err, row) {
                            if (err) {
                                console.error('err', err);
                            } else {
                                if (row.affectedRows == 1) {
                                    success = true;
                                    callback(success);
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