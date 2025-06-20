var mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'DogWalkService',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

module.exports = (async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    await connection.query('DROP DATABASE IF EXISTS DogWalkService');
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Create database connection pool
    const pool = mysql.createPool(dbConfig);

    // Create tables
    await pool.execute(`
    CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'walker') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

    await pool.execute(`
      CREATE TABLE Dogs (
    dog_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    size ENUM('small', 'medium', 'large') NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id)
    );`);

    await pool.execute(`
    CREATE TABLE WalkRequests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
    );`);

    await pool.execute(`
    CREATE TABLE WalkApplications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        CONSTRAINT unique_application UNIQUE (request_id, walker_id)
    );`);

    await pool.execute(`
    CREATE TABLE WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
    );`);

    // Insert data
    await pool.execute(`
            INSERT into Users (username, email, password_hash, role)
    VALUES ('alice123', 'alice@example.com', 'hashed123', 'owner'),
    ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
    ('carol123', 'carol@example.com', 'hashed789', 'owner'),
    ('angry_man', 'angry@man.com', '$2b$10$ttq6ltzFIbm', 'owner'),
    ('sad_woman', 'sad@woman.com', '$2b$10$7ivWqdUnMRNSqJD', 'walker');
      `);

       // Insert data
    await pool.execute(`
            INSERT into Dogs (name, size, owner_id)
    VALUES ('Max', 'medium', (SELECT user_id FROM Users WHERE username = 'alice123')),
    ('Bella', 'small', (SELECT user_id FROM Users WHERE username = 'carol123')),
    ('Diesel', 'large', (SELECT user_id FROM Users WHERE username = 'angry_man')),
    ('Stinky', 'medium', (SELECT user_id FROM Users WHERE username = 'angry_man')),
    ('Woggy', 'small', (SELECT user_id FROM Users WHERE username = 'carol123'));
      `);

       // Insert data
    await pool.execute(`
      INSERT into WalkRequests (dog_id, requested_time, duration_minutes, location, status)
  VALUES ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Diesel'), '2025-06-25 12:00:00', 60, 'Norwood', 'open'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Woggy'), '2025-06-22 09:00:00', 30, 'Burnside', 'open'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Stinky'), '2025-06-21 12:35:00', 25, 'Glenelg', 'accepted');
      `);

     // Insert data
    await pool.execute(`
      INSERT into WalkApplications (request_id, walker_id, applied_at, status)
  VALUES ((SELECT WalkRequests.request_id FROM WalkRequests JOIN Dogs on Dogs.dog_id = WalkRequests.dog_id WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Diesel'), '2025-06-25 12:00:00', 60, 'Norwood', 'open'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Woggy'), '2025-06-22 09:00:00', 30, 'Burnside', 'open'),
  ((SELECT dog_id FROM Dogs WHERE name = 'Stinky'), '2025-06-21 12:35:00', 25, 'Glenelg', 'accepted');
      `);
    return pool;

  } catch (err) {
    console.error('Error setting up database.', err);
    process.exit(1);
  }
})();