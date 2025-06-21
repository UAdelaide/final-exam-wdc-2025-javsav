var express = require('express');
var router = express.Router();

module.exports = function(pool) {
  // Function to ensure user is logged in
  function requireLogin(req, res, next) {
      if (req.session && req.session.user && req.session.user.id) {
          return next();
      }
      res.redirect('/index.html');
  }

  // Route that redirects user to appropriate dashboard based on their role
  router.get('/dashboard', requireLogin, async (req, res) => {
      try {
      const user = req.session.user;

      if (user.role === 'owner') {

        // Get list of user's dogs
        const [dogs] = await pool.execute('SELECT name, dog_id FROM Dogs WHERE owner_id = ?', [req.session.user.id]);

        // Pass dogs through to ejs template
        res.render('owner-dashboard', {
            user: user,
            dogs: dogs
         });

      } else if (user.role === 'walker') {
          res.render('walker-dashboard', { user: user });
      }


  // Catch any errors
  } catch (error) {
      console.error('Error rendering dashboard:', error);
      res.status(500).send('Error loading dashboard page.');
  }
  });

  /* Returns a list of all dogs with their size and owner name */
router.get('/api/dogs', async function(req, res, next) {
  try {
  console.log("Sending doglist");
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


  return router;
};