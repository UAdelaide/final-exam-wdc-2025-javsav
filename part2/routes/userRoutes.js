var express = require('express');
const bcrypt = require('bcrypt');
var router = express.Router();
require('dotenv').config();


module.exports = function(pool) {
// Checks for invalid characters for a username
function containsInvalidChars(term) {
    const invalidCharsRegex = /[^a-zA-Z0-9_]/; // Matches anything not alphanumeric or underscore
    return invalidCharsRegex.test(term);
}

// Checks if an email is valid
function isValidEmail(email) {
  const emailRegex = new RegExp(
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );

  return emailRegex.test(email);
}

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


/* Receive register requests */
router.post('/register', async (req, res) => {
    console.log('Received registration request:', req.body.username, req.body.email);

    // Get request body
    const { username, email, password, role, confirmedPassword } = req.body;

    // validation

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    if (password !== confirmedPassword) {
        return res.status(400).json({ message: 'Passwords do not match. Please try again.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email address entered. Please try again.' });
    }

    try {
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        console.log('Password hashed successfully.');

        // Insert into database
        const sql = 'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)';
        const values = [username, email, passwordHash, role];


        const [result] = await pool.query(sql, values);
        const userId = result.insertId;
        console.log('User inserted successfully, ID:', userId);

        res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });

    } catch (error) {
        console.error('Registration error:', error);

        // Handle duplicate entry
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Username or email already exists.' });
        }

        // Other errors
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
});

// Get the user object from the session
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

/* Receive login requests */
  router.post('/login', async (req, res) => {
  console.log('Received login request:', req.body.username);

  // Get POST request body
  const { username, password } = req.body;

   if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
}

try {
  // Query database for user
   const sql = 'SELECT user_id, email, username, password_hash, role FROM Users WHERE username = ?';
    const values = [username];

    const [results] = await pool.query(sql, values);

    if (results.length === 0) {
        console.log(`Login attempt failed: User '${username}' not found.`);
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = results[0];
    console.log(user.user_id, user.email, user.username, user.password_hash, user.role);
    const storedPasswordHash = user.password_hash;
    const passwordMatches = await bcrypt.compare(password, storedPasswordHash);

    if (passwordMatches) {
        // --- Login Successful ---

        // Store session data in req.session.user
        req.session.userId = user.user_id;
        req.session.username = user.username;
        req.session.user = {
            id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role
        };
        res.status(200).json({
            message: 'Login successful!',
            userId: user.user_id,
            username: user.username,
            role: user.role
        });

    } else {
        // Passwords do not match
        console.log(`Login attempt failed: Incorrect password for user '${username}'.`);
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

} catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
}
});

// Destroy session data (log user out)
router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            return next(err);
        }
        // Session destroyed successfully

        res.clearCookie('connect.sid');

        res.redirect('/index.html');
    });
});


  return router;
};
