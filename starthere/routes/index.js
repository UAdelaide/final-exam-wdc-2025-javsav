var express = require('express');
const mysql = require('mysql2/promise');
var app = express();
var router = express.Router();
const pool = require('./../db');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


module.exports = router;
