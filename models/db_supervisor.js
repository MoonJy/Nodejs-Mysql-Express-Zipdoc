var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);
var async = require('async');
var common = require('../lib/common');

exports.login=function(datas,done){
    pool.getConnection(function(err, conn){
        conn.query("select count(*) cnt from Supervisor where id=? and passwd = ?", datas, function(err, rows){
            if(err) console.log('err', err);
            console.log('rows', rows);
            var sucess=false;
            if(rows[0].cnt == 1){
                sucess=true;
            }
            done(sucess);
            conn.release();
        });
    });
};

