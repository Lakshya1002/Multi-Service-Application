const fs = require('fs');

// Read the database password from the secret file
const dbPassword = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();

// Switch to appdb database
const appDb = db.getSiblingDB('appdb');

// Create the application user
appDb.createUser({
  user: 'app_user',
  pwd: dbPassword,
  roles: [
    { role: 'readWrite', db: 'appdb' }
  ]
});

print('MongoDB initialization script: app_user created successfully on appdb.');
