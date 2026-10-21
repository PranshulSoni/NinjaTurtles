# 🎓 Faculty Viva & Code Explanation Guide
### Team Ninja Turtles - Food Ordering Platform
*Consolidated 3-File Architecture (Vue.js + Node.js + Express + MongoDB)*

---

## 1. High-Level Architecture: Why Only 3 Files?

When your faculty asks: **"Show me your project structure and files."**
> **Viva Answer**:  
> *"Ma'am/Sir, rather than creating 25 fragmented files with complicated bundler configurations, I organized the entire application into a clean, transparent 3-file architecture:
> 1. `server.js`: Contains our Express backend, MongoDB Mongoose models, REST API routes, and Socket.io real-time server.
> 2. `public/app.js`: Contains our complete Vue.js frontend application logic in a single pure JavaScript file using the standard Options API.
> 3. `public/index.html`: Contains our clean UI structure with Tailwind CSS styling and Vue directives.
> This makes the entire codebase easy to read, debug, and maintain."*

---

## 2. Backend Breakdown: `server.js`

Here is what happens in `server.js` from top to bottom:

### 1. Module Imports
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
```
- **Express**: Handles HTTP routing and REST endpoints.
- **http**: Wraps the Express app so Socket.io can share the exact same server port (`5000`).
- **Mongoose**: Connects Node.js to MongoDB using Schemas.
- **CORS**: Allows cross-origin requests.

### 2. Static File Serving
```javascript
app.use(express.static(path.join(__dirname, 'public')));
```
> **Viva Explanation**: This tells Express to serve `index.html` and `app.js` from the `public` folder whenever someone opens `http://localhost:5000`. This means we only need one server command (`npm start`) to run both the frontend and backend together!

### 3. Database Models in `server.js`
- **`Restaurant`**: Stores restaurant name, cuisine, rating, delivery time, address, and image.
- **`FoodItem`**: Stores dish name, price, description, veg/non-veg flag (`isVeg`), and availability (`isAvailable`). Contains `restaurantId` referencing the `Restaurant` model.
- **`Order`**: Stores customer details (name, phone, address), ordered items array, total amount, and order status (`enum: ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered']`).

### 4. Real-Time Socket.io Handlers
- **When user places an order (`POST /api/orders`)**:
  ```javascript
  io.emit('newOrder', order);
  ```
  Broadcasts the new order live to the Restaurant Portal.
- **When restaurant updates order status (`PATCH /api/orders/:id/status`)**:
  ```javascript
  io.emit('orderStatusUpdated', order);
  ```
  Broadcasts the new status live to the customer's Order Tracker screen.

---

## 3. Frontend Breakdown: `public/app.js`

The entire Vue application lives in `public/app.js` and follows the classic **Options API**:

```javascript
const { createApp } = Vue;

createApp({
  data() { ... },
  computed: { ... },
  mounted() { ... },
  methods: { ... }
}).mount('#app');
```

### 1. `data()`: Reactive State
- `currentView`: Which tab is active (`'restaurants'`, `'menu'`, `'orders'`, `'restaurant-admin'`).
- `restaurants`: List of restaurants fetched from `/api/restaurants`.
- `cart`: Array of items added by the customer with quantities.
- `orders`: List of orders placed.
- `isSocketConnected`: Tracks if the real-time websocket connection is active.

### 2. `computed`: Dynamic Calculations
- `cartCount`: Total number of items in the cart (`cart.reduce(...)`).
- `cartTotal`: Sum of item prices times quantities.
- `filteredRestaurants`: Filters restaurants by search text and cuisine category.
- `filteredMenuItems`: Filters dishes by Pure Veg 🟢 vs Non-Veg 🔴.

### 3. `mounted()`: Lifecycle Hook
- Executes when the page loads.
- Calls `fetchRestaurants()` and `fetchOrders()`.
- Connects to Socket.io (`this.socket = io()`).
- Sets up listeners:
  ```javascript
  this.socket.on('orderStatusUpdated', (updatedOrder) => { ... });
  this.socket.on('newOrder', (newOrder) => { ... });
  ```

### 4. `methods`: Application Actions
- `addToCart(dish, restaurant)`: Adds or increments an item in the cart.
- `placeOrder()`: Sends `POST /api/orders` with delivery details.
- `updateOrderStatus(orderId, newStatus)`: Restaurant sends `PATCH /api/orders/:id/status`.
- `toggleStock(dishId)`: Restaurant toggles In-Stock / Out-of-Stock via `PATCH /api/menu/:id/toggle`.

---

## 4. Top 10 Viva Questions and Answers

#### Q1: Why use WebSockets / Socket.io instead of regular HTTP requests?
> **Answer**: Regular HTTP requires the client to repeatedly send requests (polling) to check for updates. Socket.io maintains an open, full-duplex connection so the server can push updates to the client the exact millisecond the restaurant changes the order status.

#### Q2: What is the purpose of `express.static()`?
> **Answer**: It serves static client files (HTML, CSS, JS, images) from a designated folder directly to the browser when the user accesses the root URL.

#### Q3: What is the difference between `data()` and `computed` in Vue?
> **Answer**: `data()` stores raw reactive state variables, whereas `computed` properties are derived calculations based on reactive data that automatically cache their results and re-evaluate only when their dependencies change.

#### Q4: How does Vue achieve two-way data binding?
> **Answer**: Using the `v-model` directive. It synchronizes the value of an HTML input element with a JavaScript data property in both directions.

#### Q5: What is Mongoose?
> **Answer**: Mongoose is an Object Data Modeling (ODM) library for MongoDB that provides schema validation, type checking, and query helpers for Node.js applications.

#### Q6: Why did you use `io.emit()` instead of `socket.emit()`?
> **Answer**: `socket.emit()` sends a message only back to the single socket client that triggered the event. `io.emit()` broadcasts the event to all connected clients (so both the user and the restaurant dashboards receive live updates).

#### Q7: What is CORS and why is it needed?
> **Answer**: Cross-Origin Resource Sharing. It is a security mechanism enforced by browsers that prevents scripts on one origin from accessing resources on another origin unless the server explicitly allows it.

#### Q8: What is an `enum` in Mongoose?
> **Answer**: An `enum` is a validation rule that restricts a string field to an approved list of values (e.g., `'Order Placed'`, `'Preparing'`, `'Out for Delivery'`, `'Delivered'`).

#### Q9: How does the pure veg filter work?
> **Answer**: In `public/app.js`, `filteredMenuItems` filters the array of dishes based on the dish's boolean `isVeg` property when the user toggles between 'All', 'Veg', and 'Non-Veg'.

#### Q10: How does single-page navigation work without page reloads?
> **Answer**: We use a `currentView` reactive variable (`'restaurants'`, `'menu'`, `'orders'`, `'restaurant-admin'`) and `v-if` directives in `index.html` to conditionally show/hide sections instantly in the browser.

---

## 8. High-Availability & Database Resilience (Faculty Viva Point!)

### Q: "What happens if MongoDB service is stopped or crashes during runtime?"
> **Viva Answer**:
> *"In enterprise production systems, a backend shouldn't crash or return blank pages if the database connection drops temporarily. In `server.js`, we designed an **auto-retry connection loop** and an **in-memory fallback data store**.
> 1. If MongoDB is unavailable (`ECONNREFUSED`), the backend automatically serves seeded restaurants and dishes from the fallback store so the user experience is uninterrupted.
> 2. The server continuously attempts to reconnect in the background (`setTimeout(connectToDatabase, 6000)`).
> 3. Once MongoDB restarts, the server seamlessly restores live database operations without needing any manual restart."*
