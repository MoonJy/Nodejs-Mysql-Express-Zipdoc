var winston = require('winston');
var moment = require('moment');
var logger = new winston.Logger({

    transports : [
        new winston.transports.Console({
            level:'debug',
            colorize: true
        }),
        new winston.transports.DailyRotateFile({
            level: 'debug',
            timestamp: function(){
                return moment().format("YYYY-MM-DD HH:mm:ss");
            },
            filename:'app-debug',
            dirname:'./logs',
            maxsize:1024*1024*10,
            datePattern:'.yyyy-MM-dd.log'
        })
    ]
});

module.exports = logger;

//이렇게 지정해 놨을때
/* 우리가 사용하는 프로세스가 있는데
 * 로그정보를 하나는 콘솔로 하나는 파일로 해서 로깅을 한다.
 * 자 이때 콘솔로는 여러분들이 디버그,인포,에러,원 이런것을 사용했을때
 *
 * debug
 * info
 * warn
 * error
 *
 * 이렇게 있을대
 * debug면
 * debug info warn error 다 나오고
 * warn이면 warn error 이렇게 나온다
 * 이런것을 디버그 레벨이라고 한다.
 */