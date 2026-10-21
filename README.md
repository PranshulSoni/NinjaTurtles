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
│   └── server.js      # Express backend, MongoDB Models, Socket.io Real-Time, REST APIs
│
├── server.js          # Root launcher forwarding to backend/server.js
├── package.json       # Dependencies (express, mongoose, socket.io, cors)
├── README.md          # Setup instructions
└── VIVA_GUIDE.md      # Line-by-line explanation guide for your professor
```

---

## Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | Vue.js (100% pure JavaScript file `public/app.js`) |
| **Styling** | Tailwind CSS (simple student-level styling) |
| **Backend** | Node.js with Express JS (`server.js`) |
| **Real-Time** | Socket.io (instant order tracking & kitchen notifications) |
| **Database** | MongoDB with Mongoose |

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

## Features

1. **Browse Restaurants**: Search by name or filter by cuisine (*Burgers, Pizza, Biryani, Snacks*).
2. **Food Menu**: Filter Pure Veg vs Non-Veg dishes with price and descriptions.
3. **Cart & Checkout**: Dynamic quantity controls `[-] qty [+]` with subtotal, 5% GST, and delivery charges.
4. **Live Order Tracking**: Real-time 4-stage stepper (`Order Placed` -> `Preparing` -> `Out for Delivery` -> `Delivered`).
5. **Restaurant Portal (Admin)**:
   - Live incoming kitchen orders screen with one-click status buttons.
   - Advance status -> customer's screen updates **instantly via Socket.io** without page refresh!
   - Manage menu: toggle In-Stock / Out-of-Stock, delete dishes, or add new dishes.

---

## Faculty Viva Preparation
Read **`VIVA_GUIDE.md`** for a clear breakdown of `server.js` and `app.js`, plus direct answers to common viva questions.
