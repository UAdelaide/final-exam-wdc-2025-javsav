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
          res.render('owner-dashboard', { user: user });
      } else if (user.role === 'walker') {
          res.render('walker-dashboard', { user: user });
      }
  // Catch any errors
  } catch (error) {
      console.error('Error rendering dashboard:', error);
      res.status(500).send('Error loading dashboard page.');
  }
  });

  return router;
};