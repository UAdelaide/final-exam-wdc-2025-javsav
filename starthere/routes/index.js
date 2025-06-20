var express = require('express');
var app = express();
var router = express.Router();
const pool = require('./../db');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/api/dogs', function(req, res, next) {

});

module.exports = router;
