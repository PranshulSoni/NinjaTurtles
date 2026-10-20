// server.js
// Complete Full-Stack Backend for Food Ordering Platform (Team Ninja Turtles)
// Contains: Express Server, MongoDB Models, Socket.io Real-Time, REST APIs & Static Frontend Serving

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
app.use(express.static(path.join(__dirname, 'public'))); // Serves index.html & app.js

// 4. Connect to MongoDB Database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully!');
    await seedInitialDataIfEmpty();
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// ==========================================
// 5. MONGOOSE DATABASE SCHEMAS & MODELS
// ==========================================

// Restaurant Schema
const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cuisine: { type: String, required: true },
    rating: { type: Number, default: 4.3 },
    deliveryTime: { type: String, default: '30-40 mins' },
    priceForTwo: { type: Number, default: 350 },
    address: { type: String, default: 'Ahmedabad' },
    imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600' },
  },
  { timestamps: true }
);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// Food Item / Dish Schema
const foodItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    category: { type: String, default: 'Main Course' },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500' },
  },
  { timestamps: true }
);
const FoodItem = mongoose.model('FoodItem', foodItemSchema);

// Order Schema
const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    restaurantName: { type: String, required: true },
    items: [
      {
        foodItemId: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Order Placed',
    },
  },
  { timestamps: true }
);
const Order = mongoose.model('Order', orderSchema);


// ==========================================
// 7. REST API ENDPOINTS
// ==========================================

// GET /api/restaurants -> List all restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const list = await Restaurant.find().sort({ rating: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restaurants/:id/menu -> List menu dishes for a restaurant
app.get('/api/restaurants/:id/menu', async (req, res) => {
  try {
    const items = await FoodItem.find({ restaurantId: req.params.id });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders -> List all orders (latest first)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders -> Customer places an order
app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order({ ...req.body, status: 'Order Placed' });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. AUTO-SEED DATABASE IF EMPTY
// ==========================================
// 8. AUTO-SEED DATABASE IF EMPTY
// ==========================================
async function seedInitialDataIfEmpty() {
  const count = await Restaurant.countDocuments();
  if (count > 0) return; // Already has data

  console.log('🌱 Seeding sample restaurant data into MongoDB...');
  const restaurants = [
    {
      name: 'Burger King',
      cuisine: 'Burgers, Fast Food, Beverages',
      rating: 4.3,
      deliveryTime: '25-30 mins',
      priceForTwo: 350,
      address: 'Alpha One Mall, Vastrapur, Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600',
    },
    {
      name: "La Pino'z Pizza",
      cuisine: 'Pizza, Italian, Fast Food',
      rating: 4.4,
      deliveryTime: '30-35 mins',
      priceForTwo: 450,
      address: 'Sindhu Bhavan Road, Bodakdev, Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
    },
    {
      name: 'Biryani By Kilo',
      cuisine: 'Biryani, Mughlai, Kebabs',
      rating: 4.5,
      deliveryTime: '35-45 mins',
      priceForTwo: 600,
      address: 'SG Highway, Gota, Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
    },
    {
      name: "Haldiram's Sweets & Snacks",
      cuisine: 'North Indian, Street Food, Mithai',
      rating: 4.6,
      deliveryTime: '20-30 mins',
      priceForTwo: 300,
      address: 'Drive-In Road, Memnagar, Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
    },
  ];

  for (const r of restaurants) {
    const createdRest = await Restaurant.create(r);
    // Add sample food items
    await FoodItem.create([
      {
        restaurantId: createdRest._id,
        name: `${createdRest.name} Special Dish 1`,
        description: 'Chef signature recipe prepared with fresh ingredients and authentic spices.',
        price: 199,
        category: 'Main Course',
        isVeg: true,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      },
      {
        restaurantId: createdRest._id,
        name: `${createdRest.name} Crispy Starter`,
        description: 'Golden crispy delight served with delicious dipping sauce.',
        price: 129,
        category: 'Starters',
        isVeg: true,
        imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500',
      },
      {
        restaurantId: createdRest._id,
        name: `${createdRest.name} Chilled Beverage`,
        description: 'Refreshing cold beverage made to complement your meal.',
        price: 89,
        category: 'Beverages',
        isVeg: true,
        imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500',
      },
    ]);
  }
  console.log('✅ Sample data seeded successfully!');
}


// 9. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Food Delivery Server running on http://localhost:${PORT}`);
});
