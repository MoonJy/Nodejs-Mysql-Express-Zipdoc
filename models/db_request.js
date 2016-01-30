var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);

/*
 문의하기 프로토콜
 DB
 ver 0.3
 */
exports.send_req = function(datas, callback){
    pool.getConnection(function(err,conn){
        if(err){
            console.log('err',err);
        }else {
            var sql = "insert into Request (Member_UUID,Title,Category,Content,Email) values (?,?,?,?,?)";
            conn.query(sql, datas, function (err, row) {
                if (err) {
                    console.log('err', err);
                }
                var success = false;
                if (row.affectedRows == 1) {
                    success = true;
                }
                conn.release();
                callback(success);
            });
        }
    });
};