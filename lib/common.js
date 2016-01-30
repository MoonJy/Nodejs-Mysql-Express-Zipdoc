var logger = require('../config/logger');
var path = require('path');
var easyimg = require('easyimage');

module.exports.serverDNSHost = "http://ec2-52-68-13-7.ap-northeast-1.compute.amazonaws.com";
module.exports.serverHost = 'http://52.68.13.7';

//connection error
module.exports.dbError =  function connectionError(err, errMessage ) {
    logger.debug(errMessage+'데이터베이스 연결 객체를 얻지 못했습니다');
    logger.error(err);

    //res.json({
    //    "success" :0,
    //    "result"  : {
    //        "message":errMessage+" 오류가 발생 하였습니다. "
    //    }
    //});
}

//connection exit
module.exports.dbExit = function endConnection(err, connection, errMessage) {
    if (err) {
        logger.error(err);
    }
    logger.debug( errMessage + '데이터베이스와의 연결을 종료합니다!');
    connection.release();
}

module.exports.rollback = function rollback(err,function_name, connection) {
    connection.rollback(function() {
        console.log(err);
        console.log(function_name+" 롤백되었습니다...");
    });
}

module.exports.commit = function commit(function_name,connection) {
    connection.commit(function(err) {
        if (err) {
            rollback(err, function_name);
            return;
        }
        console.log(function_name+" 커밋되었습니다...");
    });
}

//check null
module.exports.checkNull = function (array) {
    var check = true;
    var count = array.length;
    for (var i = 0; i < count; i++) {
        if (array[i] == null) {
            console.log('null param', i);
            check = false;
            break;
        }
    }
    return check;
};

module.exports.checkBlank = function(array){
    var check = true;
    var cnt = array.length;
    for ( var i=0; i<cnt ; i++){
        if(array[i]==""){
            console.log('black is no no', i);
            check = false;
            break;
        }
    }
    return check;
};

module.exports.thumnailFunc = function(temp){
    var thumbPath = temp
    //console.log('destPath',destPath);
    easyimg.thumbnail({
        src:thumbPath, dst: thumbPath,
        width:252, height:252,
        x:0, y:0
    }).then(function(file){
        console.log('file',file);
    }, function(err){
        console.log('err',err);
    });
};

