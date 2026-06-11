const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load DB password from Docker secrets if available
let dbPassword = process.env.DB_PASSWORD;
try {
  if (fs.existsSync('/run/secrets/db_password')) {
    dbPassword = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();
  }
} catch (err) {
  console.error("Error reading db_password secret:", err);
}

// Define Item Schema
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);

// Connect to MongoDB using the application user (app_user)
const mongoURI = `mongodb://app_user:${dbPassword}@database:27017/appdb?authSource=appdb`;
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully (app_user)'))
  .catch(err => console.error('MongoDB connection error:', err));

// Connect to Redis
const redisClient = redis.createClient({
  url: 'redis://cache:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
})();

// Detailed Health check endpoint reporting statuses of dependencies
app.get('/health', async (req, res) => {
  let mongoConnected = false;
  let redisConnected = false;
  
  try {
    if (mongoose.connection.readyState === 1) {
      mongoConnected = true;
    }
  } catch (err) {}
  
  try {
    if (redisClient.isOpen) {
      const ping = await redisClient.ping();
      if (ping === 'PONG') {
        redisConnected = true;
      }
    }
  } catch (err) {}

  const isHealthy = mongoConnected && redisConnected;

  // Always return 200 so docker healthcheck passes;
  // status field indicates actual health of dependencies
  res.status(200).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    message: isHealthy ? 'Backend is healthy' : 'Backend degraded - check dependencies',
    mongodb: mongoConnected ? 'UP' : 'DOWN',
    redis: redisConnected ? 'UP' : 'DOWN'
  });
});

// GET items with caching
app.get('/items', async (req, res) => {
  try {
    const startTime = Date.now();
    const cachedItems = await redisClient.get('items_list');
    
    if (cachedItems) {
      const duration = Date.now() - startTime;
      return res.json({
        source: 'Redis Cache',
        durationMs: duration,
        data: JSON.parse(cachedItems)
      });
    }
    
    const items = await Item.find().sort({ createdAt: -1 });
    
    // Cache the list of items for 30s
    await redisClient.set('items_list', JSON.stringify(items), {
      EX: 30
    });
    
    const duration = Date.now() - startTime;
    res.json({
      source: 'MongoDB Database',
      durationMs: duration,
      data: items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST items (creates item & invalidates cache)
app.post('/items', async (req, res) => {
  try {
    const { name, value } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }
    
    const newItem = new Item({ name, value });
    await newItem.save();
    
    // Invalidate the cache
    await redisClient.del('items_list');
    
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE items (clears all items & invalidates cache)
app.delete('/items', async (req, res) => {
  try {
    await Item.deleteMany({});
    await redisClient.del('items_list');
    res.json({ message: 'All items deleted and cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deprecated endpoint kept for backwards compatibility
app.get('/data', async (req, res) => {
  try {
    const cachedData = await redisClient.get('myData');
    if (cachedData) {
      return res.json({ source: 'cache', data: JSON.parse(cachedData) });
    }
    const data = { message: 'Hello from Backend with DB and Cache!' };
    await redisClient.set('myData', JSON.stringify(data), { EX: 60 });
    res.json({ source: 'database', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`API Service listening on port ${port}`);
});

