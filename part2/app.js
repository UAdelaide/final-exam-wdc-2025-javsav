const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

// Import the db promise and the user router function
const poolPromise = require('./models/db');
const createIndexRouter = require('./routes/index');
const createUserRouter = require('./routes/userRoutes');
const createWalkRouter = require('./routes/walkRoutes');

const app = express();

async function initializeApp() {
    // Wait for database pool to be ready
    console.log('Waiting for database pool...');
    const pool = await poolPromise;
    console.log('Database pool is ready.');

    // Middelware Setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '/public')));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Session Setup
    const sessionStore = new MySQLStore({
      expiration: 1000 * 60 * 60 * 24,
      createDatabaseTable: true,
      schema: {
          tableName: 'sessions',
          columnNames: {
              session_id: 'session_id',
              expires: 'expires',
              data: 'data'
          }
      }
    }, pool);

    // Setup session middleware
    app.use(session({
      secret: process.env.SESSION_SECRET,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24
      }
    }));


    // Create the user and index router by passing the pool to the factory function
    const userRoutes = createUserRouter(pool);
    const indexRouter = createIndexRouter(pool);
    const walkRoutes = createWalkRouter(pool);
    // Use the created routers
    app.use('/', indexRouter);
    app.use('/api/walks', walkRoutes);
    app.use('/api/users', userRoutes);

    return app;
}

// Export the promise that resolves to the configured app object
module.exports = initializeApp();
