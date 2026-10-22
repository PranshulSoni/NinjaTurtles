// backend/server.js
// Clean REST Backend for Food Ordering Platform (Team Ninja Turtles)
// Express JS + Native MongoDB Driver (MongoClient)

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
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

// 2. MongoClient Database Connection
const client = new MongoClient(MONGO_URI);
let db;
let restaurantsCol;
let foodItemsCol;
let ordersCol;
let usersCol;
let isConnected = false;

// Helper: Safely convert string to ObjectId if valid
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    return new ObjectId(id);
  }
  return null;
}


// Helper: Query by _id accepting both ObjectId and String
function byId(id) {
  const oid = toObjectId(id);
  if (oid) {
    return { _id: oid };
  } else {
    return { _id: id };
  }
}

// Helper: Token Generator
function generateToken(user) {
  return Buffer.from(
    JSON.stringify({
      _id: user._id,
      id: user._id,
      role: user.role,
      email: user.email,
      restaurantId: user.restaurantId,
    })
  ).toString('base64');
}

// Connect to MongoDB and initialize collections
async function connectDB() {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'food_delivery_db');
    restaurantsCol = db.collection('restaurants');
    foodItemsCol = db.collection('fooditems');
    ordersCol = db.collection('orders');
    usersCol = db.collection('users');
    isConnected = true;
    console.log('Connected to MongoDB via MongoClient');
    await seedInitialData();
  } catch (err) {
    isConnected = false;
    console.error('MongoDB connection error:', err.message);
  }
}
connectDB();

// 3. Authentication Endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await usersCol.findOne({ email: cleanEmail });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      token: generateToken(user),
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurantName: user.restaurantName,
        phone: user.phone || '',
        address: user.address || '',
      },
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
    const existingEmail = await usersCol.findOne({ email: cleanEmail });
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    // 2. Check if username already taken
    const existingUsername = await usersCol.findOne({ name: new RegExp(`^${cleanName}$`, 'i') });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const newUser = {
      name: cleanName,
      email: cleanEmail,
      password,
      role,
      phone,
      address,
      createdAt: new Date(),
    };

    const result = await usersCol.insertOne(newUser);
    newUser._id = result.insertedId;

    res.status(201).json({
      token: generateToken(newUser),
      user: {
        _id: newUser._id,
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        address: newUser.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => res.json({ message: 'Logged out successfully' }));

// 4. Restaurant & Menu Endpoints
app.get('/api/restaurants', async (req, res) => {
  try {
    const list = await restaurantsCol.find().toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/restaurants/:id/menu', async (req, res) => {
  try {
    const restId = req.params.id;
    const oid = toObjectId(restId);
    let query;

    if (oid) {
      query = { $or: [{ restaurantId: oid }, { restaurantId: restId }] };
    } else {
      query = { restaurantId: restId };
    }

    const items = await foodItemsCol.find(query).toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restaurants/:id/menu', async (req, res) => {
  try {
    let isVeg = true;
    if (req.body.isVeg !== undefined) {
      isVeg = req.body.isVeg;
    }

    let isAvailable = true;
    if (req.body.isAvailable !== undefined) {
      isAvailable = req.body.isAvailable;
    }

    let restaurantId = req.params.id;
    const parsedRestId = toObjectId(restaurantId);
    if (parsedRestId) {
      restaurantId = parsedRestId;
    }

    const itemData = {
      ...req.body,
      restaurantId,
      isVeg,
      isAvailable,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await foodItemsCol.insertOne(itemData);
    itemData._id = result.insertedId;
    res.status(201).json(itemData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/menu/:id/toggle', async (req, res) => {
  try {
    const filter = byId(req.params.id);
    const item = await foodItemsCol.findOne(filter);
    if (!item) return res.status(404).json({ error: 'Dish not found' });
    const newAvailable = !item.isAvailable;
    await foodItemsCol.updateOne(filter, { $set: { isAvailable: newAvailable, updatedAt: new Date() } });
    item.isAvailable = newAvailable;
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    const result = await foodItemsCol.deleteOne(byId(req.params.id));
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Dish not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Orders Endpoints (Filtered per User or Restaurant)
app.get('/api/orders', async (req, res) => {
  try {
    // Auto-advance: any order that has been "Out for Delivery" for >= 30 seconds becomes "Delivered"
    const cutoff = new Date(Date.now() - 30 * 1000);
    await ordersCol.updateMany(
      { status: 'Out for Delivery', updatedAt: { $lte: cutoff } },
      { $set: { status: 'Delivered', updatedAt: new Date() } }
    );

    const query = {};
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.restaurantId) {
      const restId = req.query.restaurantId;
      const oid = toObjectId(restId);
      if (oid) {
        query.$or = [{ restaurantId: oid }, { restaurantId: restId }];
      } else {
        query.restaurantId = restId;
      }
    }

    const orders = await ordersCol.find(query).sort({ createdAt: -1 }).toArray();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const now = new Date();
    const orderData = {
      ...req.body,
      restaurantId: toObjectId(req.body.restaurantId) || req.body.restaurantId,
      status: req.body.status || 'Order Placed',
      createdAt: now,
      updatedAt: now,
    };
    const result = await ordersCol.insertOne(orderData);
    orderData._id = result.insertedId;
    res.status(201).json(orderData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const updateData = { status: req.body.status, updatedAt: new Date() };
    const filter = byId(req.params.id);
    const result = await ordersCol.findOneAndUpdate(
      filter,
      { $set: updateData },
      { returnDocument: 'after' }
    );
    let order;
    if (result && result.value !== undefined) {
      order = result.value;
    } else {
      order = result;
    }
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Auto-advance: exactly 30 seconds after becoming "Out for Delivery", automatically mark as "Delivered"
    if (req.body.status === 'Out for Delivery') {
      setTimeout(async () => {
        try {
          await ordersCol.updateOne(filter, { $set: { status: 'Delivered', updatedAt: new Date() } });
          console.log(`Order ${req.params.id} automatically marked as Delivered after 30 seconds.`);
        } catch (err) {
          console.error(`Auto-delivery update failed for order ${req.params.id}:`, err.message);
        }
      }, 30000);
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. System Health Check & Fallback Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dbConnected: isConnected,
    database: 'food_delivery_db',
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// 7. Initial Database Seeder
async function seedInitialData() {
  try {
    const usersCount = await usersCol.countDocuments();
    if (usersCount === 0) {
      await usersCol.insertMany([
        {
          name: 'Rahul Sharma',
          email: 'user@ninjafood.com',
          password: 'user123',
          role: 'customer',
          phone: '9825123456',
          address: 'Flat 402, Green Avenue, Ahmedabad',
        },
        {
          name: 'Chef Vikram (Admin)',
          email: 'admin@ninjafood.com',
          password: 'admin123',
          role: 'admin',
          phone: '9876543210',
          address: 'Ninja Kitchen HQ, Ahmedabad',
        },
      ]);
    }

    // Ensure dedicated restaurant admin accounts exist
    const restList = await restaurantsCol.find().toArray();
    if (restList.length > 0) {
      for (const r of restList) {
        let slug = 'admin';
        if (r.name.toLowerCase().includes('burger')) slug = 'burgerking';
        else if (r.name.toLowerCase().includes('lapinoz') || r.name.toLowerCase().includes('pino')) slug = 'lapinoz';
        else if (r.name.toLowerCase().includes('biryani')) slug = 'biryani';
        else slug = 'haldirams';
        const adminEmail = `admin@${slug}.com`;
        const exists = await usersCol.findOne({ email: adminEmail });
        if (!exists) {
          await usersCol.insertOne({
            name: `${r.name} Admin`,
            email: adminEmail,
            password: 'admin123',
            role: 'admin',
            restaurantId: r._id,
            restaurantName: r.name,
            phone: '9876543210',
            address: r.address || 'Kitchen Hub',
          });
        }
      }

      const zomatoAdmin = await usersCol.findOne({ email: 'admin@zomato.com' });
      if (!zomatoAdmin) {
        await usersCol.insertOne({
          name: 'Zomato Platform Admin',
          email: 'admin@zomato.com',
          password: 'admin123',
          role: 'admin',
          restaurantId: restList[0]._id,
          restaurantName: restList[0].name,
          phone: '9876543210',
          address: 'Zomato HQ',
        });
      }
    }

    const restCount = await restaurantsCol.countDocuments();
    if (restCount > 0) return;

    const seedData = [
      {
        name: 'Burger King',
        cuisine: 'Burgers, Fast Food',
        rating: 4.3,
        deliveryTime: '25-30 mins',
        priceForTwo: 350,
        address: 'Alpha One Mall, Vastrapur',
        imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600',
        dishes: [
          { name: 'Crispy Veg Burger', price: 99, category: 'Main Course', isVeg: true, description: 'Crispy patty with special mayo' },
          { name: 'Chicken Whopper', price: 199, category: 'Main Course', isVeg: false, description: 'Flame grilled chicken patty' },
          { name: 'Peri Peri Fries', price: 119, category: 'Starters', isVeg: true, description: 'Golden fries with spicy seasoning' },
        ],
      },
      {
        name: "La Pino'z Pizza",
        cuisine: 'Pizza, Italian',
        rating: 4.4,
        deliveryTime: '30-35 mins',
        priceForTwo: 450,
        address: 'Sindhu Bhavan Road',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
        dishes: [
          { name: 'Margherita Pizza', price: 199, category: 'Main Course', isVeg: true, description: 'Classic cheese and herb pizza' },
          { name: 'Farm Villa Pizza', price: 289, category: 'Main Course', isVeg: true, description: 'Loaded with veggies and cheese' },
          { name: 'Garlic Bread Stix', price: 129, category: 'Starters', isVeg: true, description: 'Baked bread with cheesy dip' },
        ],
      },
      {
        name: 'Behrouz Biryani',
        cuisine: 'Biryani, Mughlai',
        rating: 4.6,
        deliveryTime: '35-40 mins',
        priceForTwo: 600,
        address: 'Drive In Road, Memnagar',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
        dishes: [
          { name: 'Subz-e-Biryani (Veg)', price: 295, category: 'Main Course', isVeg: true, description: 'Aromatic rice with vegetables' },
          { name: 'Dum Gosht Mutton Biryani', price: 445, category: 'Main Course', isVeg: false, description: 'Slow cooked tender mutton' },
          { name: 'Gulab Jamun (2 Pcs)', price: 85, category: 'Dessert', isVeg: true, description: 'Warm khoya dumplings' },
        ],
      },
      {
        name: 'Chai Sutta Bar',
        cuisine: 'Snacks, Beverages',
        rating: 4.2,
        deliveryTime: '20-25 mins',
        priceForTwo: 200,
        address: 'SG Highway, Gota',
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600',
        dishes: [
          { name: 'Kulhad Masala Chai', price: 30, category: 'Beverages', isVeg: true, description: 'Spiced Indian tea in earthen cup' },
          { name: 'Cheese Grilled Sandwich', price: 120, category: 'Snacks', isVeg: true, description: 'Toasted with veggies and molten cheese' },
          { name: 'Bun Maska', price: 50, category: 'Snacks', isVeg: true, description: 'Fresh bun with creamy butter' },
        ],
      },
    ];

    for (const r of seedData) {
      const restInsert = await restaurantsCol.insertOne({
        name: r.name,
        cuisine: r.cuisine,
        rating: r.rating,
        deliveryTime: r.deliveryTime,
        priceForTwo: r.priceForTwo,
        address: r.address,
        imageUrl: r.imageUrl,
      });
      const restId = restInsert.insertedId;
      const dishes = r.dishes.map((d) => {
        let isVeg = true;
        if (d.isVeg !== undefined) {
          isVeg = d.isVeg;
        }
        return {
          ...d,
          restaurantId: restId,
          imageUrl: r.imageUrl,
          isVeg,
          isAvailable: true,
        };
      });
      await foodItemsCol.insertMany(dishes);
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

// 8. Start Server
app.listen(PORT, () => {
  let host;
  if (process.env.RENDER) {
    host = 'https://ninjaturtles.onrender.com';
  } else {
    host = `http://localhost:${PORT}`;
  }
  console.log(`Food Delivery Server running on ${host}`);
});
