var express = require('express');
var router = express.Router();
// We no longer need to require userRoutes or dotenv here.

// The entire file is wrapped in a function that accepts the pool
module.exports = function(pool) {

    // Function to require login. This logic is perfect and needs no changes.
    function requireLogin(req, res, next) {
        // The session is attached by the middleware in app.js, so this will work.
        if (req.session && req.session.user && req.session.user.id) {
            return next();
        }
        // Redirect to the login page (or show an error)
        // Note: You might want a public login page instead of redirecting to index.html
        // which might be a protected resource itself. For now, this is fine.
        res.redirect('/login.html'); // Assuming you have a public login.html
    }

    // Once a user is logged in, detect their role and redirect them accordingly.
    // This route now correctly uses the requireLogin middleware first.
    router.get('/dashboard', requireLogin, async (req, res) => {
        try {
            // Note: Your requireLogin middleware already ensures req.session.user exists.
            const user = req.session.user;

            // Simple role-based rendering
            if (user.role === 'owner') {
                res.render('owner-dashboard', { user: user }); // Passing the whole user object is cleaner
            } else if (user.role === 'walker') {
                res.render('walker-dashboard', { user: user });
            } else {
                // Handle cases where the role is something unexpected
                res.status(403).send('Forbidden: Unknown user role');
            }
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            res.status(500).send('Error loading dashboard page.');
        }
    });

    // You could add other index routes here. For example, a route that does need the database:
    router.get('/stats', async (req, res) => {
        // Now you can safely use the pool!
        const [userCount] = await pool.query("SELECT COUNT(*) as count FROM Users");
        res.json({ totalUsers: userCount[0].count });
    });


    // Return the configured router
    return router;
};