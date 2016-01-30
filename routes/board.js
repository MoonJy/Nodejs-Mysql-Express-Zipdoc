/**
 * Created by Moonji on 2015-05-15.
 */
var express = require('express');
var router = express.Router();

router.get('/main', function (req, res, next) {
    var id =req.session.user_id;
    res.render('board/main', { title: '메인',user_id:id});
});
<!--git hub test-->
module.exports = router;