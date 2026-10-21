// backend/server.js
// Complete Full-Stack Backend for Food Ordering Platform (Team Ninja Turtles)
// Features: Express Server, MongoDB Database Connection, Mongoose Models, RBAC, Socket.io Real-Time, REST APIs

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// 1. Initialize Express App & HTTP Server
const app = express();
const server = http.createServer(app);

// 2. Initialize Socket.io for Real-time WebSockets
const io = new Server(server, {
  cors: { origin: '*' },
});

// 3. Middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend files from frontend/ folder
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// 4. Connect to MongoDB Database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`Connected to MongoDB successfully: ${MONGO_URI}`);
    await seedInitialDataIfEmpty();
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
  }
}
connectToDatabase();

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected.');
});
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established.');
});

// ==========================================
// 5. MONGOOSE DATABASE SCHEMAS & MODELS
// ==========================================

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cuisine: { type: String, required: true },
    rating: { type: Number, default: 4.0 },
    deliveryTime: { type: String, default: '30 mins' },
    priceForTwo: { type: Number, default: 300 },
    address: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

const foodItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    category: { type: String, default: 'Main Course' },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    imageUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    restaurantName: { type: String, default: '' },
    items: [
      {
        foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered'],
      default: 'Order Placed',
    },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const FoodItem = mongoose.model('FoodItem', foodItemSchema);
const Order = mongoose.model('Order', orderSchema);
const User = mongoose.model('User', userSchema);

// ==========================================
// 6. REAL-TIME SOCKET.IO HANDLERS
// ==========================================
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// 7. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================

function generateToken(user) {
  const payload = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in.' });
  }
  req.user = decoded;
  next();
}

function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
}

// ==========================================
// 8. REST API ROUTES (STRICT MONGODB QUERIES)
// ==========================================

// GET /api/health -> Database & System Health Check
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? 'ok' : 'error',
    dbConnected: isConnected,
    database: 'food_delivery_db',
    timestamp: new Date().toISOString(),
  });
});

// POST /api/auth/login -> Sign in user against MongoDB
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register -> Sign up new user in MongoDB
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone = '', address = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email: cleanEmail,
      password,
      role: role === 'admin' ? 'admin' : 'customer',
      phone,
      address,
    });

    const token = generateToken(user);
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me -> Current authenticated user from MongoDB
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found in database.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout -> Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/users -> Admin endpoint to view registered users
app.get('/api/auth/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restaurants -> Get all restaurants from MongoDB
app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fooditems -> Get food items from MongoDB (optionally filtered by restaurantId)
app.get('/api/fooditems', async (req, res) => {
  try {
    const query = req.query.restaurantId ? { restaurantId: req.query.restaurantId } : {};
    const items = await FoodItem.find(query);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fooditems -> Add dish to MongoDB (Admin only)
app.post('/api/fooditems', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { restaurantId, name, description, price, category, isVeg, imageUrl } = req.body;
    if (!restaurantId || !name || !price) {
      return res.status(400).json({ error: 'restaurantId, name, and price are required' });
    }

    const newItem = await FoodItem.create({
      restaurantId,
      name,
      description: description || '',
      price: Number(price),
      category: category || 'Main Course',
      isVeg: isVeg !== undefined ? isVeg : true,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop',
    });

    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/fooditems/:id/toggle -> Toggle dish availability in MongoDB (Admin only)
app.patch('/api/fooditems/:id/toggle', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Food item not found' });

    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fooditems/:id -> Delete dish from MongoDB (Admin only)
app.delete('/api/fooditems/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const item = await FoodItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Food item not found' });
    res.json({ message: 'Item deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders -> Get all orders from MongoDB
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders -> Create new order in MongoDB and broadcast live via Socket.io
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, customerPhone, deliveryAddress, restaurantId, restaurantName, items, totalAmount } = req.body;
    if (!customerName || !customerPhone || !deliveryAddress || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order fields or empty items' });
    }

    const order = await Order.create({
      customerName,
      customerPhone,
      deliveryAddress,
      restaurantId,
      restaurantName,
      items,
      totalAmount,
      status: 'Order Placed',
    });

    // Broadcast new order live to restaurant kitchen portal
    io.emit('newOrder', order);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status -> Update order status in MongoDB and broadcast status change
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Broadcast status change live to customer
    io.emit('orderStatusUpdated', order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback route to serve frontend/index.html for SPA view routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ==========================================
// 9. INITIAL DATABASE SEEDER (RUNS ON EMPTY DB)
// ==========================================
async function seedInitialDataIfEmpty() {
  try {
    // 1. Seed demo users if users collection is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding demo users into MongoDB...');
      await User.create([
        {
          name: 'Rahul Sharma',
          email: 'user@ninjafood.com',
          password: 'user123',
          role: 'customer',
          phone: '9825123456',
          address: 'Flat 402, Green Avenue, Nirma Campus, Ahmedabad',
        },
        {
          name: 'Chef Vikram (Admin)',
          email: 'admin@ninjafood.com',
          password: 'admin123',
          role: 'admin',
          phone: '9876543210',
          address: 'Ninja Kitchen HQ, Vastrapur, Ahmedabad',
        },
      ]);
      console.log('Demo users seeded successfully into MongoDB!');
    }

    // 2. Seed restaurants and dishes if restaurants collection is empty
    const restCount = await Restaurant.countDocuments();
    if (restCount > 0) return;

    console.log('Seeding sample restaurants and food items into MongoDB...');
    const seedRestaurants = [
      {
        name: 'Burger King',
        cuisine: 'Burgers, Fast Food, Beverages',
        rating: 4.3,
        deliveryTime: '25-30 mins',
        priceForTwo: 350,
        address: 'Alpha One Mall, Vastrapur, Ahmedabad',
        imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&auto=format&fit=crop',
        dishes: [
          { name: 'Crispy Veg Burger', price: 99, category: 'Main Course', isVeg: true, description: 'Crispy veg patty with special sauce' },
          { name: 'Chicken Whopper', price: 199, category: 'Main Course', isVeg: false, description: 'Flame-grilled chicken patty with fresh lettuce' },
          { name: 'Peri Peri Fries', price: 119, category: 'Starters', isVeg: true, description: 'Golden fries sprinkled with spicy seasoning' },
          { name: 'Chocolate Thick Shake', price: 149, category: 'Beverages', isVeg: true, description: 'Rich creamy chocolate shake' },
        ],
      },
      {
        name: "La Pino'z Pizza",
        cuisine: 'Pizza, Italian, Fast Food',
        rating: 4.4,
        deliveryTime: '30-35 mins',
        priceForTwo: 450,
        address: 'Sindhu Bhavan Road, Bodakdev, Ahmedabad',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop',
        dishes: [
          { name: 'Margherita Pizza', price: 199, category: 'Main Course', isVeg: true, description: 'Classic cheese and herb pizza' },
          { name: 'Farm Villa Pizza', price: 289, category: 'Main Course', isVeg: true, description: 'Loaded with capsicum, onion, mushroom, and olives' },
          { name: 'Chicken Tikka Pizza', price: 349, category: 'Main Course', isVeg: false, description: 'Tandoori chicken chunks with spicy sauce' },
          { name: 'Garlic Bread Stix', price: 129, category: 'Starters', isVeg: true, description: 'Freshly baked garlic bread with cheesy dip' },
        ],
      },
      {
        name: 'Behrouz Biryani',
        cuisine: 'Biryani, Mughlai, North Indian',
        rating: 4.6,
        deliveryTime: '35-40 mins',
        priceForTwo: 600,
        address: 'Drive In Road, Memnagar, Ahmedabad',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop',
        dishes: [
          { name: 'Subz-e-Biryani (Veg)', price: 295, category: 'Main Course', isVeg: true, description: 'Aromatic basmati rice cooked with fresh vegetables' },
          { name: 'Dum Gosht Mutton Biryani', price: 445, category: 'Main Course', isVeg: false, description: 'Tender mutton cooked under slow dum with fragrant spices' },
          { name: 'Murgh Tikka Kebab', price: 280, category: 'Starters', isVeg: false, description: 'Charcoal grilled chicken kebabs' },
          { name: 'Gulab Jamun (2 Pcs)', price: 85, category: 'Dessert', isVeg: true, description: 'Warm khoya dumplings soaked in saffron syrup' },
        ],
      },
      {
        name: 'Chai Sutta Bar',
        cuisine: 'Snacks, Fast Food, Beverages',
        rating: 4.2,
        deliveryTime: '20-25 mins',
        priceForTwo: 200,
        address: 'Near Nirma University, SG Highway, Ahmedabad',
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop',
        dishes: [
          { name: 'Kulhad Masala Chai', price: 30, category: 'Beverages', isVeg: true, description: 'Authentic Indian spiced tea served in earthen kulhad' },
          { name: 'Cheese Grilled Sandwich', price: 120, category: 'Snacks', isVeg: true, description: 'Jumbo bread stuffed with veggies and molten cheese' },
          { name: 'Bun Maska', price: 50, category: 'Snacks', isVeg: true, description: 'Soft bun loaded with fresh creamy butter' },
          { name: 'Cold Coffee with Ice Cream', price: 90, category: 'Beverages', isVeg: true, description: 'Thick blended coffee topped with vanilla scoop' },
        ],
      },
    ];

    for (const r of seedRestaurants) {
      const createdRest = await Restaurant.create({
        name: r.name,
        cuisine: r.cuisine,
        rating: r.rating,
        deliveryTime: r.deliveryTime,
        priceForTwo: r.priceForTwo,
        address: r.address,
        imageUrl: r.imageUrl,
      });

      const dishes = r.dishes.map((d) => ({
        restaurantId: createdRest._id,
        name: d.name,
        description: d.description,
        price: d.price,
        category: d.category,
        isVeg: d.isVeg,
        imageUrl: r.imageUrl,
      }));

      await FoodItem.create(dishes);
    }
    console.log('Sample restaurants and dishes seeded successfully into MongoDB!');
  } catch (e) {
    console.error('Seeding error:', e.message);
  }
}

// 10. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Food Delivery Server running on http://localhost:${PORT}`);
});
