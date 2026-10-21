# Ninja Turtles - Food Ordering Platform

A simple, complete Full-Stack real-time food ordering platform built by **Team Ninja Turtles**.

---

## Clean Project Structure

The project is cleanly divided into `frontend/` and `backend/` folders for modularity and easy explanation:

```
Assignment/
│
├── frontend/
│   ├── index.html     # HTML structure with Tailwind CSS & Vue 3 template
│   ├── app.js         # The entire Vue.js frontend logic in pure JavaScript
│   └── css/
│       └── style.css  # Dedicated frontend styles & transitions
│
├── backend/
│   └── server.js      # Express backend, MongoDB Models, REST APIs
│
├── package.json       # Dependencies (express, mongoose, cors)
├── README.md          # Setup instructions
└── VIVA_GUIDE.md      # Line-by-line explanation guide for your professor
```

---

## Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | Vue.js (100% pure JavaScript file `frontend/app.js`) |
| **Styling** | Tailwind CSS & custom CSS (`frontend/css/style.css`) |
| **Backend** | Node.js with Express JS (`backend/server.js`) |
| **Database** | MongoDB with Mongoose (Strict Database) |

---

## How to Run the Project (1 Single Command!)

1. **Make sure MongoDB is running:**
   ```bash
   podman start local-mongodb
   ```
   *(Or start your local MongoDB service: `sudo systemctl start mongod`)*

2. **Start the application:**
   ```bash
   npm start
   ```

3. **Open in your browser:**
   ```
   http://localhost:5000
   ```
   *(Express serves both the Vue frontend and the real-time API on port 5000)*

---

## MongoDB Database: Where and How It Is Created

1. **Database Name & Connection URI**:
   - URI: `mongodb://127.0.0.1:27017/food_delivery_db`
   - Database: `food_delivery_db`

2. **How MongoDB Creates Databases**:
   - MongoDB creates databases and collections **lazily/on-the-fly**.
   - As soon as the backend connects and calls `User.create()` or `Restaurant.create()`, MongoDB automatically allocates the database `food_delivery_db` and collections (`restaurants`, `fooditems`, `orders`, `users`).
   - If a database or collection does not exist yet, MongoDB creates it instantly upon the first insert without requiring manual table creation.

3. **Where Data Lives on the Machine**:
   - The container `local-mongodb` mounts persistent volume storage at `/data/db`.
   - On the host filesystem, it resides in the container storage volume directory:
     `/home/pranshulsoni/.local/share/containers/storage/volumes/.../_data`

4. **How to View and Query the Database**:
   ```bash
   # Connect to mongosh inside the container:
   podman exec -it local-mongodb mongosh food_delivery_db

   # Inspect collections:
   show collections

   # View records:
   db.restaurants.find().pretty()
   db.users.find()
   db.orders.find()
   ```

---

## Features

1. **Browse Restaurants**: Search by name or filter by cuisine (*Burgers, Pizza, Biryani, Snacks*).
2. **Food Menu**: Filter Pure Veg vs Non-Veg dishes with price and descriptions.
3. **Cart & Checkout**: Dynamic quantity controls `[-] qty [+]` with subtotal, 5% GST, and delivery charges.
4. **Order Tracking**: 4-stage stepper (`Order Placed` -> `Preparing` -> `Out for Delivery` -> `Delivered`) isolated per customer account.
5. **Restaurant Portal (Admin)**:
   - Incoming kitchen orders screen with one-click status buttons.
   - Advance status -> customer's order updates via REST API.
   - Manage menu: toggle In-Stock / Out-of-Stock, delete dishes, or add new dishes.

---

## Faculty Viva Preparation
Read **`VIVA_GUIDE.md`** for a clear breakdown of `server.js` and `app.js`, plus direct answers to common viva questions.
