// backend/server.js
// Clean REST Backend for Food Ordering Platform (Team Ninja Turtles)
// Express JS + MongoDB (Mongoose)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';
const frontendDir = path.join(__dirname, '..', 'frontend');

// 1. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(frontendDir));

// 2. MongoDB Database Connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    seedInitialData();
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));

// 3. Database Schemas & Models
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cuisine: { type: String, required: true },
  rating: { type: Number, default: 4.0 },
  deliveryTime: { type: String, default: '30 mins' },
  priceForTwo: { type: Number, default: 300 },
  address: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
});

const foodItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  category: { type: String, default: 'Main Course' },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  imageUrl: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, default: '' },
  userEmail: { type: String, default: '' },
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
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const FoodItem = mongoose.model('FoodItem', foodItemSchema);
const Order = mongoose.model('Order', orderSchema);
const User = mongoose.model('User', userSchema);

// Helper: Token Generator
function generateToken(user) {
  return Buffer.from(JSON.stringify({ _id: user._id, id: user._id, role: user.role, email: user.email })).toString('base64');
}

// 4. Authentication Endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const identifier = (email || '').trim();
    if (!identifier || !password) return res.status(400).json({ error: 'Email or username and password required' });

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { name: new RegExp(`^${identifier}$`, 'i') },
      ]
    });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    res.json({
      token: generateToken(user),
      user: { _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, address: user.address },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone = '', address = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // 1. Check if email already registered
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    // 2. Check if username (name) already taken
    const existingUsername = await User.findOne({ name: new RegExp(`^${cleanName}$`, 'i') });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role,
      phone,
      address,
    });

    res.status(201).json({
      token: generateToken(user),
      user: { _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, address: user.address },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => res.json({ message: 'Logged out successfully' }));

// 5. Restaurant & Menu Endpoints
app.get('/api/restaurants', async (req, res) => {
  try {
    const list = await Restaurant.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/restaurants/:id/menu', async (req, res) => {
  try {
    const items = await FoodItem.find({ restaurantId: req.params.id });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fooditems', async (req, res) => {
  try {
    const filter = req.query.restaurantId ? { restaurantId: req.query.restaurantId } : {};
    const items = await FoodItem.find(filter);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fooditems', async (req, res) => {
  try {
    const item = await FoodItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/restaurants/:id/menu', async (req, res) => {
  try {
    const item = await FoodItem.create({ ...req.body, restaurantId: req.params.id });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch(['/api/fooditems/:id/toggle', '/api/menu/:id/toggle'], async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Dish not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(['/api/fooditems/:id', '/api/menu/:id'], async (req, res) => {
  try {
    const item = await FoodItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Dish not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Orders Endpoints (Filtered per User or Restaurant)
app.get('/api/orders', async (req, res) => {
  try {
    const query = {};
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.restaurantId) query.restaurantId = req.query.restaurantId;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. System Health Check & Fallback Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dbConnected: mongoose.connection.readyState === 1,
    database: 'food_delivery_db',
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// 8. Initial Database Seeder
async function seedInitialData() {
  try {
    const usersCount = await User.countDocuments();
    if (usersCount === 0) {
      await User.create([
        { name: 'Rahul Sharma', email: 'user@ninjafood.com', password: 'user123', role: 'customer', phone: '9825123456', address: 'Flat 402, Green Avenue, Ahmedabad' },
        { name: 'Chef Vikram (Admin)', email: 'admin@ninjafood.com', password: 'admin123', role: 'admin', phone: '9876543210', address: 'Ninja Kitchen HQ, Ahmedabad' },
      ]);
    }

    const restCount = await Restaurant.countDocuments();
    if (restCount > 0) return;

    const seedData = [
      {
        name: 'Burger King', cuisine: 'Burgers, Fast Food', rating: 4.3, deliveryTime: '25-30 mins', priceForTwo: 350, address: 'Alpha One Mall, Vastrapur',
        imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600',
        dishes: [
          { name: 'Crispy Veg Burger', price: 99, category: 'Main Course', isVeg: true, description: 'Crispy patty with special mayo' },
          { name: 'Chicken Whopper', price: 199, category: 'Main Course', isVeg: false, description: 'Flame grilled chicken patty' },
          { name: 'Peri Peri Fries', price: 119, category: 'Starters', isVeg: true, description: 'Golden fries with spicy seasoning' },
        ],
      },
      {
        name: "La Pino'z Pizza", cuisine: 'Pizza, Italian', rating: 4.4, deliveryTime: '30-35 mins', priceForTwo: 450, address: 'Sindhu Bhavan Road',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
        dishes: [
          { name: 'Margherita Pizza', price: 199, category: 'Main Course', isVeg: true, description: 'Classic cheese and herb pizza' },
          { name: 'Farm Villa Pizza', price: 289, category: 'Main Course', isVeg: true, description: 'Loaded with veggies and cheese' },
          { name: 'Garlic Bread Stix', price: 129, category: 'Starters', isVeg: true, description: 'Baked bread with cheesy dip' },
        ],
      },
      {
        name: 'Behrouz Biryani', cuisine: 'Biryani, Mughlai', rating: 4.6, deliveryTime: '35-40 mins', priceForTwo: 600, address: 'Drive In Road, Memnagar',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
        dishes: [
          { name: 'Subz-e-Biryani (Veg)', price: 295, category: 'Main Course', isVeg: true, description: 'Aromatic rice with vegetables' },
          { name: 'Dum Gosht Mutton Biryani', price: 445, category: 'Main Course', isVeg: false, description: 'Slow cooked tender mutton' },
          { name: 'Gulab Jamun (2 Pcs)', price: 85, category: 'Dessert', isVeg: true, description: 'Warm khoya dumplings' },
        ],
      },
      {
        name: 'Chai Sutta Bar', cuisine: 'Snacks, Beverages', rating: 4.2, deliveryTime: '20-25 mins', priceForTwo: 200, address: 'SG Highway, Gota',
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600',
        dishes: [
          { name: 'Kulhad Masala Chai', price: 30, category: 'Beverages', isVeg: true, description: 'Spiced Indian tea in earthen cup' },
          { name: 'Cheese Grilled Sandwich', price: 120, category: 'Snacks', isVeg: true, description: 'Toasted with veggies and molten cheese' },
          { name: 'Bun Maska', price: 50, category: 'Snacks', isVeg: true, description: 'Fresh bun with creamy butter' },
        ],
      },
    ];

    for (const r of seedData) {
      const rest = await Restaurant.create({ name: r.name, cuisine: r.cuisine, rating: r.rating, deliveryTime: r.deliveryTime, priceForTwo: r.priceForTwo, address: r.address, imageUrl: r.imageUrl });
      const dishes = r.dishes.map((d) => ({ ...d, restaurantId: rest._id, imageUrl: r.imageUrl }));
      await FoodItem.create(dishes);
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

// 9. Start Server
app.listen(PORT, () => console.log(`Food Delivery Server running on http://localhost:${PORT}`));
