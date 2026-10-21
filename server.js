// server.js
// Complete Full-Stack Backend for Food Ordering Platform (Team Ninja Turtles)
// Features: Express Server, MongoDB Models, In-Memory Fallback, Socket.io Real-Time, REST APIs

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

// ==========================================
// 4. IN-MEMORY FALLBACK STORE (HIGH AVAILABILITY)
// ==========================================
let isDbConnected = false;

const fallbackRestaurants = [
  {
    _id: '6ad789e72c06223043482c5a',
    name: 'Burger King',
    cuisine: 'Burgers, Fast Food, Beverages',
    rating: 4.3,
    deliveryTime: '25-30 mins',
    priceForTwo: 350,
    address: 'Alpha One Mall, Vastrapur, Ahmedabad',
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&auto=format&fit=crop',
  },
  {
    _id: '6ad789e72c06223043482c61',
    name: "La Pino'z Pizza",
    cuisine: 'Pizza, Italian, Fast Food',
    rating: 4.4,
    deliveryTime: '30-35 mins',
    priceForTwo: 450,
    address: 'Sindhu Bhavan Road, Bodakdev, Ahmedabad',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop',
  },
  {
    _id: '6ad789e72c06223043482c68',
    name: 'Biryani By Kilo',
    cuisine: 'Biryani, Mughlai, Kebabs',
    rating: 4.5,
    deliveryTime: '35-45 mins',
    priceForTwo: 600,
    address: 'SG Highway, Gota, Ahmedabad',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop',
  },
  {
    _id: '6ad789e72c06223043482c6f',
    name: "Haldiram's Sweets & Snacks",
    cuisine: 'North Indian, Street Food, Mithai',
    rating: 4.6,
    deliveryTime: '20-30 mins',
    priceForTwo: 300,
    address: 'Drive-In Road, Memnagar, Ahmedabad',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop',
  },
];

let fallbackFoodItems = [
  // Burger King
  {
    _id: '6ad789e72c06223043482d01',
    restaurantId: '6ad789e72c06223043482c5a',
    name: 'Whopper Veg Burger',
    description: 'Flame-grilled signature plant patty with fresh lettuce, onions, pickles, and mayo.',
    price: 189,
    category: 'Main Course',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500',
  },
  {
    _id: '6ad789e72c06223043482d02',
    restaurantId: '6ad789e72c06223043482c5a',
    name: 'Crispy Veg Nuggets',
    description: 'Golden fried crispy vegetarian bites served with cheesy dipping sauce.',
    price: 119,
    category: 'Starters',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500',
  },
  {
    _id: '6ad789e72c06223043482d03',
    restaurantId: '6ad789e72c06223043482c5a',
    name: 'Berry Shake',
    description: 'Thick creamy milkshake blended with wild strawberries and berries.',
    price: 99,
    category: 'Beverages',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500',
  },
  // La Pino'z
  {
    _id: '6ad789e72c06223043482d04',
    restaurantId: '6ad789e72c06223043482c61',
    name: 'Farm Villa Special Pizza',
    description: 'Capsicum, red onion, grilled mushroom, golden corn, and fresh paneer.',
    price: 299,
    category: 'Main Course',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
  },
  {
    _id: '6ad789e72c06223043482d05',
    restaurantId: '6ad789e72c06223043482c61',
    name: 'Stuffed Garlic Bread',
    description: 'Freshly baked bread filled with mozzarella, jalapeños, and sweet corn.',
    price: 149,
    category: 'Starters',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=500',
  },
  // Biryani By Kilo
  {
    _id: '6ad789e72c06223043482d06',
    restaurantId: '6ad789e72c06223043482c68',
    name: 'Hyderabadi Dum Biryani',
    description: 'Aromatic basmati rice cooked with authentic spices, caramelized onions, and tender paneer.',
    price: 349,
    category: 'Main Course',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
  },
  {
    _id: '6ad789e72c06223043482d07',
    restaurantId: '6ad789e72c06223043482c68',
    name: 'Murgh Dum Biryani',
    description: 'Traditional slow-cooked chicken dum biryani in earthen handi.',
    price: 399,
    category: 'Main Course',
    isVeg: false,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500',
  },
  // Haldiram's
  {
    _id: '6ad789e72c06223043482d08',
    restaurantId: '6ad789e72c06223043482c6f',
    name: 'Special Chole Bhature',
    description: 'Spicy tangy chickpea curry served with 2 fluffy bhature and fresh salad.',
    price: 160,
    category: 'Main Course',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500',
  },
  {
    _id: '6ad789e72c06223043482d09',
    restaurantId: '6ad789e72c06223043482c6f',
    name: 'Pani Puri Platter',
    description: 'Crispy puris with tangy mint-coriander water and spiced potato filling.',
    price: 80,
    category: 'Snacks',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
  },
  {
    _id: '6ad789e72c06223043482d10',
    restaurantId: '6ad789e72c06223043482c6f',
    name: 'Gulab Jamun (2 Pcs)',
    description: 'Soft melt-in-mouth cottage cheese dumplings soaked in warm rose-infused sugar syrup.',
    price: 90,
    category: 'Dessert',
    isVeg: true,
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop',
  },
];

let fallbackOrders = [];

// ==========================================
// 5. CONNECT TO MONGODB WITH AUTO-RETRY LOOP
// ==========================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';

function connectToDatabase() {
  mongoose
    .connect(MONGO_URI, { serverSelectionTimeoutMS: 2500 })
    .then(async () => {
      isDbConnected = true;
      console.log('✅ Connected to MongoDB successfully!');
      await seedInitialDataIfEmpty();
    })
    .catch((err) => {
      isDbConnected = false;
      console.warn('⚠️ MongoDB connection unavailable. Active in-memory fallback store enabled:', err.message);
      // Auto-retry connection every 6 seconds in background
      setTimeout(connectToDatabase, 6000);
    });
}
connectToDatabase();

mongoose.connection.on('disconnected', () => {
  isDbConnected = false;
  console.log('⚠️ MongoDB disconnected. Using in-memory fallback.');
});
mongoose.connection.on('connected', () => {
  isDbConnected = true;
  console.log('✅ MongoDB connection restored.');
});

// ==========================================
// 6. MONGOOSE DATABASE SCHEMAS & MODELS
// ==========================================

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
// 7. REAL-TIME SOCKET.IO HANDLERS
// ==========================================
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// 8. REST API ENDPOINTS (WITH RESILIENT FALLBACK)
// ==========================================

// GET /api/health -> Check database status & server health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dbConnected: isDbConnected && mongoose.connection.readyState === 1,
    mode: (isDbConnected && mongoose.connection.readyState === 1) ? 'MongoDB' : 'In-Memory Fallback',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/restaurants -> List all restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    if (isDbConnected && mongoose.connection.readyState === 1) {
      const list = await Restaurant.find().sort({ rating: -1 });
      if (list && list.length > 0) return res.json(list);
    }
    res.json(fallbackRestaurants);
  } catch (err) {
    res.json(fallbackRestaurants);
  }
});

// GET /api/restaurants/:id/menu -> List menu dishes for a restaurant
app.get('/api/restaurants/:id/menu', async (req, res) => {
  try {
    if (isDbConnected && mongoose.connection.readyState === 1) {
      const items = await FoodItem.find({ restaurantId: req.params.id });
      if (items && items.length > 0) return res.json(items);
    }
    const filtered = fallbackFoodItems.filter(
      (i) => String(i.restaurantId) === String(req.params.id)
    );
    res.json(filtered.length > 0 ? filtered : fallbackFoodItems);
  } catch (err) {
    res.json(fallbackFoodItems);
  }
});

// POST /api/restaurants/:id/menu -> Add a new dish to restaurant menu
app.post('/api/restaurants/:id/menu', async (req, res) => {
  try {
    if (isDbConnected && mongoose.connection.readyState === 1) {
      const item = new FoodItem({ ...req.body, restaurantId: req.params.id });
      await item.save();
      return res.status(201).json(item);
    }
    const newItem = {
      _id: 'dish_' + Date.now(),
      restaurantId: req.params.id,
      ...req.body,
    };
    fallbackFoodItems.push(newItem);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/menu/:id/toggle -> Toggle food in-stock / out-of-stock
app.patch('/api/menu/:id/toggle', async (req, res) => {
  try {
    if (isDbConnected && mongoose.connection.readyState === 1) {
      const item = await FoodItem.findById(req.params.id);
      if (item) {
        item.isAvailable = !item.isAvailable;
        await item.save();
        return res.json(item);
      }
    }
    const fallbackItem = fallbackFoodItems.find((i) => String(i._id) === String(req.params.id));
    if (fallbackItem) {
      fallbackItem.isAvailable = !fallbackItem.isAvailable;
      return res.json(fallbackItem);
    }
    res.status(404).json({ error: 'Item not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/menu/:id -> Delete dish from menu
app.delete('/api/menu/:id', async (req, res) => {
  try {
    if (isDbConnected && mongoose.connection.readyState === 1) {
      const deleted = await FoodItem.findByIdAndDelete(req.params.id);
      if (deleted) return res.json({ message: 'Deleted successfully' });
    }
    fallbackFoodItems = fallbackFoodItems.filter((i) => String(i._id) !== String(req.params.id));
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders -> List all orders (latest first)
app.get('/api/orders', async (req, res) => {
  try {
    if (isDbConnected && mongoose.connection.readyState === 1) {
      const orders = await Order.find().sort({ createdAt: -1 });
      return res.json(orders);
    }
    res.json(fallbackOrders);
  } catch (err) {
    res.json(fallbackOrders);
  }
});

// POST /api/orders -> Customer places an order (emits real-time event!)
app.post('/api/orders', async (req, res) => {
  try {
    let order;
    if (isDbConnected && mongoose.connection.readyState === 1) {
      order = new Order({ ...req.body, status: 'Order Placed' });
      await order.save();
    } else {
      order = {
        _id: 'ord_' + Date.now(),
        ...req.body,
        status: 'Order Placed',
        createdAt: new Date().toISOString(),
      };
      fallbackOrders.unshift(order);
    }

    // 🚀 BROADCAST NEW ORDER LIVE TO RESTAURANT PORTAL
    io.emit('newOrder', order);

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status -> Restaurant updates order status (emits real-time event!)
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    let order;
    if (isDbConnected && mongoose.connection.readyState === 1) {
      order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    }
    if (!order) {
      order = fallbackOrders.find((o) => String(o._id) === String(req.params.id));
      if (order) order.status = status;
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // 🚀 BROADCAST STATUS CHANGE LIVE TO CUSTOMER
    io.emit('orderStatusUpdated', order);

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. AUTO-SEED DATABASE IF EMPTY
// ==========================================
async function seedInitialDataIfEmpty() {
  try {
    const count = await Restaurant.countDocuments();
    if (count > 0) return; // Already has data

    console.log('🌱 Seeding sample restaurant data into MongoDB...');
    for (const r of fallbackRestaurants) {
      const createdRest = await Restaurant.create({
        name: r.name,
        cuisine: r.cuisine,
        rating: r.rating,
        deliveryTime: r.deliveryTime,
        priceForTwo: r.priceForTwo,
        address: r.address,
        imageUrl: r.imageUrl,
      });

      const dishes = fallbackFoodItems
        .filter((d) => d.restaurantId === r._id)
        .map((d) => ({
          restaurantId: createdRest._id,
          name: d.name,
          description: d.description,
          price: d.price,
          category: d.category,
          isVeg: d.isVeg,
          imageUrl: d.imageUrl,
        }));

      if (dishes.length > 0) {
        await FoodItem.create(dishes);
      }
    }
    console.log('✅ Sample data seeded successfully into MongoDB!');
  } catch (e) {
    console.warn('⚠️ Seeding skipped:', e.message);
  }
}

// 10. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Food Delivery Server running on http://localhost:${PORT}`);
});
