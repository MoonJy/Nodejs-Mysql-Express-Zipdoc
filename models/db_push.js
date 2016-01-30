var mysql = require('mysql');
var db_config = require('./zipdoc_db_config');
var pool = mysql.createPool(db_config);
