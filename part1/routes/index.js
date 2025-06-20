var express = require('express');
var router = express.Router();
const poolPromise = require('../db');
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

let pool;
async function initialisePool() {
  pool = await poolPromise;
}

initialisePool();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Returns a list of all dogs with their size and owner name */
router.get('/api/dogs', async function(req, res, next) {
  try {

  const [result] = await pool.query(
        'SELECT Dogs.name as dog_name, Dogs.size, Users.username as owner_username FROM Dogs JOIN Users on Users.user_id = Dogs.owner_id'
  );
  res.json({
    dogs: result
  });
} catch (error) {
  console.error('Error retrieving list of dogs from database: ' + error);
  res.status(500).json({ message: 'Internal server error when fetching dog list.' });
}
});

/* Returns a list of all open walk requests */
router.get('/api/walkrequests/open', async function(req, res, next) {
  try {

  const [result] = await pool.query(
        `SELECT WalkRequests.request_id, Dogs.name as dog_name, WalkRequests.requested_time, WalkRequests.duration_minutes, WalkRequests.location, Users.username as owner_username FROM WalkRequests JOIN Dogs on Dogs.dog_id = WalkRequests.dog_id JOIN Users on Users.user_id = Dogs.owner_id WHERE WalkRequests.status = 'open'`
  );
  res.json({
    requests: result
  });
} catch (error) {
  console.error('Error retrieving list of open walk requests from database: ' + error);
  res.status(500).json({ message: 'Internal server error when fetching walk request list.' });
}
});

/* Returns a list of each walker with their average rating  and number of completed walks */
router.get('/api/walkers/summary', async function(req, res, next) {
  try {

  const [result] = await pool.query(
        `SELECT Users.username AS walker_username,
        COALESCE(RatingSummary.total_ratings, 0) AS total_ratings, ROUND(RatingSummary.average_rating, 2) as average_rating, COALESCE(CompletedWalksSummary.completed_walks, 0) AS completed_walks
        FROM Users LEFT JOIN (SELECT walker_id, COUNT(rating_id) AS total_ratings, AVG(rating) AS average_rating FROM WalkRatings GROUP BY walker_id) AS RatingSummary ON Users.user_id = RatingSummary.walker_id
        LEFT JOIN (SELECT WalkApplications.walker_id, COUNT(WalkRequests.request_id) AS completed_walks FROM WalkRequests JOIN WalkApplications ON WalkRequests.request_id = WalkApplications.request_id WHERE WalkRequests.status = 'completed' AND WalkApplications.status = 'accepted' GROUP BY WalkApplications.walker_id) AS CompletedWalksSummary ON Users.user_id = CompletedWalksSummary.walker_id
        WHERE Users.role = 'walker'
        ORDER BY Users.username`
  );
  res.json({
    walkers: result
  });
} catch (error) {
  console.error('Error retrieving walker summary from database: ' + error);
  res.status(500).json({ message: 'Internal server error when retrieving walker summary.' });
}
});



module.exports = router;
