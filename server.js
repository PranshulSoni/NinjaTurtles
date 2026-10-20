// server.js
// Backend for Food Ordering Platform (Team Ninja Turtles)

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// Schemas & Models
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Food Delivery Server running on http://localhost:${PORT}`);
});
