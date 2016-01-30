var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);
var async = require('async');
var common = require('../lib/common');
var logger = require('../config/logger');
var crypto = require('crypto');

/*
 업체로그인
 DB conn
 ver 1.0
 */

//로그인 확인 쿼리
var login_sql = "select count(*) cnt from Company_Admin where Admin_Email=? and SerialNum=?";
exports.login = function compantLogin(datas, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            common.dbError(err, "로그인 중");
            return;
        }
        conn.query(login_sql, datas, function (err, row) {
            if (err) {
                console.error('err', err);
                return;
            } else {
                var success = false;
                if (row[0].cnt == 1) {
                    var com_sql = 'select Company_Num cnt from Company_Admin where Admin_Email = ?';
                    conn.query(com_sql, [datas[0]], function (err, row) {
                        if (err) {
                            console.error('err', err);
                        } else {
                            if (row[0]) {
                                success = true;
                                callback(row[0]);
                            } else {
                                logger.debug("확인 된 결과가 없습니다.");
                            }
                        }
                    });
                } else {
                    callback(success);
                    common.dbExit(err, conn, "로그인 중");
                }
            }
        });
    });
};
/*
 업체가입
 DB conn
 ver 1.0
 */

var select_sql = "select count(Company_Email) cnt" //이미 있는 업체 확인하기
    + " from CompanyRegister cr"
    + " where cr.Company_Email = ?";
var insert_sql = "insert into CompanyRegister (Company_name,Company_Email,Company_Address,Company_Tel,Company_Phone,SerialNum)" //업체 가입 하기
    + " values (?,?,?,?,?,?)";
exports.register = function companyRegister(datas, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            common.dbError(err, "회원가입 중");
            return;
        }
        else {
            conn.beginTransaction(function (err) {
                if (err) {
                    common.dbExit(err, conn, "업체 가입중");
                    return;
                }
                async.waterfall([
                        function (callback) {
                            conn.query(select_sql, datas[1], function (err, row) {
                                if (err) {
                                    callback(err);
                                    return;
                                } else {
                                    if (row[0].cnt == 0) {
                                        callback(null, datas);
                                    } else if (row[0].cnt == 1) {
                                        console.log('rows[0].cnt', row[0].cnt);
                                        callback(new Error("이미 있는 계정입니다."));
                                    }
                                }
                            });
                        }],
                    function (err, datas) {
                        if (err) {
                            console.error('error', err);
                            common.rollback(err, "companyRegister", conn); //companyRegister rollback
                            common.dbExit(err, conn, "업체 가입중");
                        } else {
                            conn.query(insert_sql, datas, function (err, row) {
                                if (err) {
                                    common.dbExit(err, conn, "회원가입 등록중");
                                    return;
                                } else {
                                    var success = false;
                                    if (row.affectedRows == 1) {
                                        success = true;
                                        callback(success);
                                        common.commit("companyRegister", conn); // companyRegister commit
                                    } else {
                                        callback(success);
                                        common.dbExit(err, conn, "회원가입 등록중");
                                    }
                                }
                                common.dbExit(null, conn, "회원 가입 등록중");
                            });
                        }
                    });
            })
        }
    }); //pool
};

//태그 검색
var list_tagsearch_sql = "SELECT distinct c.Company_Num, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.RepairType, c.Recommend, c.coupon_Num,"
    + " (6371*ACOS(COS(RADIANS(?))* COS(RADIANS(Lat))* COS(RADIANS(Lon)"
    + " - RADIANS(?))+ SIN(RADIANS(?))* SIN(RADIANS(Lat)))) AS distance,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c, TagList t"
    + " WHERE instr(t.Tag , ?) > 0"
    + " AND c.Company_Num = t.Company_Num"
    + " ORDER BY Company_Score desc, Recommend desc, distance ASC limit ?,10";

//태그 검색 cnt
var keyword_cnt_sql = "SELECT c.Company_Num, count(c.Company_Num) cnt, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.RepairType, c.Recommend,"
    + " (6371*ACOS(COS(RADIANS(?))* COS(RADIANS(Lat))* COS(RADIANS(Lon)"
    + " - RADIANS(?))+ SIN(RADIANS(?))* SIN(RADIANS(Lat)))) AS distance,"
    + " if((select cou.Coupon_Num from Coupon cou where cou.Coupon_Num=c.Coupon_Num),1,0) coupon_Num,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c, TagList t"
    + " WHERE instr(t.Tag , ?) > 0"
    + " AND c.Company_Num = t.Company_Num";

/*
 업체리스트보기 ( 태그 검색 )
 DB conn
 */
exports.keyword = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            common.dbError(err, "태그 검색 하는중");
            return;
        }
        async.parallel({
            list: function (callback) {
                conn.query(
                    list_tagsearch_sql, [data[1], data[2], data[1], data[4], data[0], data[3] * 10], function (err,
                                                                                                               rows) {
                        if (err) {
                            console.error('err', err);
                            common.dbExit(err, conn, "태그 검색하는중");
                        } else {
                            console.log('rows', rows);
                            callback(null, rows);
                            //conn.release();
                            common.dbExit(err, conn, "태그 검색하는중");
                        }
                    });
            },
            cnt: function (callback) {
                conn.query(keyword_cnt_sql, [data[1], data[2], data[1], data[4], data[0]], function (err, row) {
                    if (err) {
                        console.error('err', err);
                        common.dbExit(err, conn, "태그 검색하는중");
                    } else {
                        console.log('rows', row);
                        callback(null, row[0].cnt);
                    }
                });
            }
        }, function (err, results) {
            if (err) {
                console.error('err', err);
                callback(err);
            } else {
                callback(results);
            }
        });
    });
};

//카테고리 검색 0번 전체 리스트 보기
var all_sql = "SELECT c.Company_Num, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.repairType,c.Recommend, c.coupon_Num,"
    + " (6371*ACOS(COS(RADIANS(?))* COS(RADIANS(Lat))* COS(RADIANS(Lon)"
    + " - RADIANS(?))+ SIN(RADIANS(?))* SIN(RADIANS(Lat)))) AS distance,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c"
    + " ORDER BY Company_Score desc, Recommend desc, distance ASC limit ?,10";

//카테고리 검색 0번 전체 검색시 total_count
var all_sql_cnt = "SELECT distinct c.Company_Num, count(c.Company_Num) cnt, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.repairType,c.Recommend,"
    + " (6371*ACOS(COS(RADIANS(?))* COS(RADIANS(Lat))* COS(RADIANS(Lon)"
    + " - RADIANS(?))+ SIN(RADIANS(?))* SIN(RADIANS(Lat)))) AS distance,"
    + " if((select cou.Coupon_Num from Coupon cou where cou.Coupon_Num=c.Coupon_Num),1,0) coupon_Num,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c";

//카테고리 검색 1~7번 검색
var category_sql = "SELECT distinct c.Company_Num, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.repairType,c.Recommend,c.coupon_Num,"
    + " (6371*ACOS(COS(RADIANS(?))* COS(RADIANS(Lat))* COS(RADIANS(Lon)"
    + " - RADIANS(?))+ SIN(RADIANS(?))* SIN(RADIANS(Lat)))) AS distance,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c, Coupon cou"
    + " WHERE c.RepairType = ? ORDER BY Company_Score desc, Recommend desc,distance ASC"
    + " limit ?,10";

//카테고리 검색 1~7번 검색 total_count
var category_sql_count = "SELECT distinct c.Company_Num, count(c.Company_Num) cnt, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.repairType,c.Recommend,"
    + " (6371*ACOS(COS(RADIANS(?))* COS(RADIANS(Lat))* COS(RADIANS(Lon)"
    + " - RADIANS(?))+ SIN(RADIANS(?))* SIN(RADIANS(Lat)))) AS distance,"
    + " if((select cou.Coupon_Num from Coupon cou where cou.Coupon_Num=c.Coupon_Num),1,0) coupon_Num,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c"
    + " WHERE c.RepairType = ? ORDER BY distance ASC";
/*
 업체리스트보기 ( 카테 고리 검색 )
 */
exports.category = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err', err);
            common.dbError(err,"카테고리 검색중");
        }
        //console.log('data category', data[0]);
        if (data[0] == 0) {
            async.parallel({
                list: function (callback) {
                    conn.query(all_sql, [data[1], data[2], data[1], data[4], data[3] * 10], function (err, rows) {
                        if (err) {
                            common.dbExit(err,conn,"카테고리 검색중");
                            return;
                        } else {
                            console.log('rows', rows);
                            logger.debug('업체 정보 리스트 ALL ');
                            conn.release();
                            callback(null, rows);
                        }
                    });
                },
                cnt: function (callback) {
                    conn.query(all_sql_cnt, [data[1], data[2], data[1], data[4], data[0]], function (err, row) {
                        if (err) {
                            console.error('err', err);
                            common.dbExit(err,conn,"카테고리 검색중");
                            return;
                        } else {
                            //logger.debug('업체 정보 리스트 ALL');
                            //conn.release();
                            console.log('row.cntdf', row[0].cnt);
                            callback(null, row[0].cnt);
                        }
                    });
                }
            }, function (err, results) {
                if (err) {
                    console.error('err', err);
                } else {
                    callback(results);
                }
            });
        }
        if (data[0] > 0 && data[0] <= 7) {
            async.parallel({
                list: function (callback) {
                    conn.query(
                        category_sql
                        , [data[1], data[2], data[1], data[4], data[0], data[3] * 10], function (err, rows) {
                            if (err) {
                                console.error('err', err);
                                common.dbExit(err,conn,"카테고리 검색중");
                                return;
                            } else {
                                console.log('rows', rows);
                                logger.debug(data[0] + '번 업종 업체 정보 리스트 뿌리기');
                                conn.release();
                                callback(null, rows);
                            }
                        });
                },
                cnt: function (callback) {
                    conn.query(
                        category_sql_count
                        , [data[1], data[2], data[1], data[4], data[0]], function (err, row) {
                            if (err) {
                                console.error('err', err);
                                common.dbExit(err,conn,"카테고리 검색중");
                                return;
                            } else {
                                console.log('cnt rows', row);
                                logger.debug(data[0] + '번 업종 업체 정보 리스트 뿌리기');
                                //conn.release();
                                callback(null, row[0].cnt);
                            }
                        });
                }
            }, function (err, results) {
                if (err) {
                    console.error('err', err);
                } else {
                    callback(results);
                }
            });
        }
    });
};

/*
 업체상세보기
 DB conn
 ver 1.0
 */
//업체 상세보기 쿼리
var company_info_sql = "select Company_Num, Lat, Lon, Name, Owner, Tel, Phone, Email, Homepage, Address, AvailableTime,  concat('" + common.serverHost + "',ci.Company_Thumbnail) Company_Thumbnail, concat('" + common.serverHost + "',ci.Company_Logo) Company_Logo, c.Coupon_Num, c.Coupon_Content, introduce, RepairType, Recommend, if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=ci.Company_Num), 1, 0) isFavorite from Company_info ci, Coupon c where ci.Company_Num = ? and ci.Coupon_Num = c.Coupon_Num";
//업체 상세보기 사진 쿼리
var company_photo_sql = "select cp.Photo_Num, concat('" + common.serverHost + "',cp.Photo_Path) Photo_Path, concat('" + common.serverHost + "',cp.Thumbnail) Thumbnail, DATE_FORMAT(cp.UpdateTime, '%Y-%m-%d') UpdateTime from Company_photo cp where Company_Num=? order by cp.UpdateTime desc";

exports.info = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            common.dbError(err, req, "업체 상세보기를 불러 오는중");
            return;
        } else {
            async.parallel({
                    detail: function (callback) {
                        conn.query(company_info_sql, [data[1], data[0]], function (err, rows) {
                            if (err) {
                                callback(err);
                            } else {
                                if (rows.length) {
                                    callback(null, rows[0]);
                                }
                            }
                        });
                    },
                    company_photo: function (callback) {
                        conn.query(company_photo_sql, [data[0]], function (err, rows) {
                            if (err) {
                                callback(err);
                            } else {
                                if (rows) {
                                    console.log('rows', rows);
                                    callback(null, rows);
                                } else {
                                    console.log('photos is null');
                                }
                            }
                        });
                    }
                },
                function (err, results) {
                    if (err) {
                        console.error('err', err);
                        common.dbExit(err,conn,"상세보기 중");
                    }
                    console.log('results', results);
                    callback(results);
                });
        }
    });
}

/*
 업체즐찾추가
 DB conn
 ver 0.5
 */
exports.favoriteY = function (datas, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err', err);
            common.dbExit(err,conn,"업체 즐겨찾기 추가중");
            return;
        }
        var sql = "select count(*) cnt from Favorite f where f.Member_UUID = ?"
            + " and f.Company_Num = ?";
        conn.query(sql, datas, function (err, rows) {
            if(err){
                common.dbError(err,"업체 즐겨찾기 추가중");
                return;
            }
            var success = false;
            if (rows[0].cnt == 1) {
                success = false;
                conn.release();
                callback(success);
            } else {
                var sql = "insert into Favorite (Member_UUID,company_num) values (?,?)";
                conn.query(sql, datas, function (err, rows) {
                    if (err) {
                        console.error('err', err);
                        common.dbExit(err,conn,"업체 즐겨찾기 추가중");
                    }
                    var success = false;
                    if (rows.affectedRows) {
                        success = true;
                    }
                    conn.release();
                    callback(success);
                });
            }
        });
    });
};

/*
 업체즐찾삭제
 DB conn
 */
exports.favoriteN = function (datas, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log('err', err);
            common.dbError(err,"업체 즐겨찾기 삭제중");
            return;
        }
        var sql = "select count(*) cnt from Favorite f where f.Member_UUID = ?"
            + " and f.Company_Num = ?";
        conn.query(sql, datas, function (err, rows) {
            var success = false;
            if (rows[0].cnt == 0) {
                console.log('cnt', rows[0].cnt);
                success = false;
                conn.release();
                callback(success);
            } else if (rows[0].cnt == 1) {
                var sql = "delete from Favorite where Member_UUID=? and Company_Num=?";
                conn.query(sql, datas, function (err, rows) {
                    if (err) console.error('err', err);
                    var success = false;
                    console.log('row', rows);
                    if (rows.affectedRows == 1) {
                        success = true;
                    }
                    conn.release();
                    callback(success);
                });
            }
        });
    });
};

var fa_sql = "SELECT c.Company_Num, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.repairType, c.Recommend, c.coupon_Num,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c, Favorite f"
    + " WHERE f.Member_UUID = ? and f.Company_Num = c.Company_Num"
    + " ORDER BY f.FavoriteTime desc";
var fa_cnt_sql = "SELECT count(*) cnt, c.Company_Num, c.Name, c.Lat, c.Lon, c.Tel, c.Phone, c.Address, concat('" + common.serverHost + "',c.Company_Thumbnail) Company_Thumbnail, c.repairType, c.Recommend, c.coupon_Num,"
    + " if((select f.Company_Num from Favorite f where f.Member_UUID=? and f.Company_Num=c.Company_Num), 1, 0) isFavorite"
    + " FROM Company_info c, Favorite f"
    + " WHERE f.Member_UUID =? and f.Company_Num = c.Company_Num"
    + " ORDER BY f.FavoriteTime desc"
/*
 업체즐찾리스트보기
 DB conn
 ver 0.5
 */
exports.favorite = function (data, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            console.error('err', err);
            return next(err);
        } else {
            async.parallel({
                list: function (callback) {
                    conn.query(
                        fa_sql
                        , [data[0], data[0]], function (err, rows) {
                            if (err) {
                                console.error('err', err);
                            } else {
                                console.log('rows', rows);
                                logger.debug(data[0] + '즐겨찾기 리스트 뿌리기');
                                conn.release();
                                callback(null, rows);
                            }
                        });
                },
                cnt: function (callback) {
                    conn.query(
                        fa_cnt_sql
                        , [data[0], data[0]], function (err, row) {
                            if (err) {
                                console.error('err', err);
                            } else {
                                console.log('cnt rows', row);
                                //conn.release();
                                callback(null, row[0].cnt);
                            }
                        });
                }
            }, function (err, results) {
                if (err) {
                    console.error('err', err);
                } else {
                    callback(results);
                }
            });
        }
    });
}

/*
 업체 탈퇴 여부 ( 관리 )
 */
var select_sql = "select count(Company_Num) cnt from Company_info where Company_Num = ?";
var update_sql = "update Company_info set Company_Flag = 'N' where Company_Num = ?";
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
                        conn.query(update_sql, data, function (err, row) {
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