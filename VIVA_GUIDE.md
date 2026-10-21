# Faculty Viva and Code Explanation Guide
### Team Ninja Turtles - Food Ordering Platform
*Modular Full-Stack Architecture (frontend/ + backend/ + Express + MongoDB)*

---

## 1. High-Level Architecture: How is the Project Structured?

When your faculty asks: **"Show me your project structure and files."**
> **Viva Answer**:  
> "Our project is organized cleanly into dedicated `frontend/` and `backend/` directories for modularity and separation of concerns:
> 1. `backend/server.js`: Contains our Express server, MongoDB Mongoose models, and REST API routes with user-isolated order management.
> 2. `frontend/app.js`: Contains our complete Vue.js frontend application logic in a single pure JavaScript file using the standard Options API.
> 3. `frontend/index.html`: Contains our clean UI structure with Tailwind CSS styling and Vue directives.
> 4. `frontend/css/style.css`: Contains custom CSS styling, transitions, and scrollbar rules.
> This makes the entire codebase modular, concise, easy to read, debug, and demonstrate."

---

## 2. Backend Breakdown: `backend/server.js`

Here is what happens in `backend/server.js` from top to bottom:

### 1. Module Imports
```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
```
- **Express**: Handles HTTP routing and REST endpoints.
- **Mongoose**: Connects Node.js to MongoDB using structured Schemas and validation.
- **CORS**: Allows cross-origin requests.
- **Path**: Resolves directory paths for static frontend file serving.

### 2. Static File Serving
```javascript
app.use(express.static(path.join(__dirname, '..', 'frontend')));
```
> **Viva Explanation**: This tells Express to serve `index.html` and `app.js` from the `frontend/` folder whenever someone opens `http://localhost:5000`. This means one single command (`npm start`) runs both the frontend and backend together.

### 3. Database Models in `server.js`
- **`Restaurant`**: Stores restaurant name, cuisine, rating, delivery time, address, and image.
- **`FoodItem`**: Stores dish name, price, description, veg/non-veg flag (`isVeg`), and availability (`isAvailable`). Contains `restaurantId` referencing the `Restaurant` model.
- **`User`**: Stores username, email, password, and role (`customer` or `admin`).
- **`Order`**: Stores customer identity (`userId`, `customerName`, `customerEmail`, `customerPhone`, `deliveryAddress`), ordered items array, total amount, and order status (`enum: ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered']`).

### 4. REST API Endpoints
- **`GET /api/restaurants`**: Returns all restaurants.
- **`GET /api/menu/:restaurantId`**: Returns menu items for a specific restaurant.
- **`POST /api/orders`**: Creates a new order attached to the user's `userId`.
- **`GET /api/orders`**: If `userId` query parameter is provided (e.g. for a customer), filters orders strictly for that user. If no `userId` is passed (admin portal), returns all restaurant orders.
- **`PATCH /api/orders/:id/status`**: Updates order status across stages.
- **`PATCH /api/menu/:id/toggle`**: Toggles menu item availability.

---

## 3. Frontend Breakdown: `frontend/app.js`

The entire Vue application lives in `frontend/app.js` and follows the classic **Options API**:

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
- `currentUser`: The currently logged-in user profile (role, email, userId).
- `restaurants`: List of restaurants fetched from `/api/restaurants`.
- `cart`: Array of items added by the customer with quantities.
- `orders`: List of orders placed by the current user (initially empty).

### 2. `computed`: Dynamic Calculations
- `cartCount`: Total number of items in the cart (`cart.reduce(...)`).
- `cartTotal`: Sum of item prices times quantities.
- `cartTax`: 5% GST calculation.
- `grandTotal`: Cart total plus tax and delivery charges.
- `filteredRestaurants`: Filters restaurants by search text and cuisine category.
- `filteredMenuItems`: Filters dishes by Pure Veg vs Non-Veg.

### 3. `mounted()`: Lifecycle Hook
- Executes when the page loads.
- Calls `fetchRestaurants()`.
- If a user is already logged in, loads their personalized orders via `fetchOrders()`.

### 4. `methods`: Application Actions
- `addToCart(dish, restaurant)`: Adds or increments an item in the cart.
- `placeOrder()`: Sends `POST /api/orders` with delivery details and current `userId`.
- `fetchOrders()`: Queries `/api/orders?userId=...` for customer view so each customer only sees their own orders.
- `updateOrderStatus(orderId, newStatus)`: Restaurant sends `PATCH /api/orders/:id/status`.
- `toggleStock(dishId)`: Restaurant toggles In-Stock / Out-of-Stock via `PATCH /api/menu/:id/toggle`.

---

## 4. Top 10 Viva Questions and Answers

#### Q1: Why use a RESTful API architecture?
> **Answer**: REST (Representational State Transfer) uses standard HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`) with stateless communication, making the backend clean, scalable, standard-compliant, and straightforward to test with tools like curl or Postman.

#### Q2: How are orders isolated between different customers?
> **Answer**: When an order is created, the client sends the logged-in user's `userId`. The backend saves this on the `Order` document. When fetching orders, customer requests include `?userId=...`, and the backend queries `Order.find({ userId })`, ensuring a new user starts with zero orders and never sees another customer's orders.

#### Q3: What is the purpose of `express.static()`?
> **Answer**: It serves static client files (HTML, CSS, JS, images) from a designated folder directly to the browser when the user accesses the root URL.

#### Q4: What is the difference between `data()` and `computed` in Vue?
> **Answer**: `data()` stores raw reactive state variables, whereas `computed` properties are derived calculations based on reactive data that automatically cache their results and re-evaluate only when their dependencies change.

#### Q5: How does Vue achieve two-way data binding?
> **Answer**: Using the `v-model` directive. It synchronizes the value of an HTML input element with a JavaScript data property in both directions.

#### Q6: What is Mongoose and why is it used?
> **Answer**: Mongoose is an Object Data Modeling (ODM) library for MongoDB that provides schema validation, type checking, default values, and query helpers for Node.js applications.

#### Q7: What is CORS and why is it needed?
> **Answer**: Cross-Origin Resource Sharing. It is a security mechanism enforced by browsers that prevents scripts on one origin from accessing resources on another origin unless the server explicitly allows it.

#### Q8: What is an `enum` in Mongoose?
> **Answer**: An `enum` is a validation rule that restricts a string field to an approved list of values (e.g., `'Order Placed'`, `'Preparing'`, `'Out for Delivery'`, `'Delivered'`).

#### Q9: How does the pure veg filter work?
> **Answer**: In `frontend/app.js`, `filteredMenuItems` filters the array of dishes based on the dish's boolean `isVeg` property when the user toggles between 'All', 'Veg', and 'Non-Veg'.

#### Q10: How does single-page navigation work without page reloads?
> **Answer**: We use a `currentView` reactive variable (`'restaurants'`, `'menu'`, `'orders'`, `'restaurant-admin'`) and `v-if` directives in `index.html` to conditionally show and hide sections instantly in the browser.
