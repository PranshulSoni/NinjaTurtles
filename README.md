# 🐢 Ninja Turtles - Food Ordering Platform

A simple, complete Full-Stack real-time food ordering platform built by **Team Ninja Turtles**.

---

## 🌟 The Simplest Possible Project Structure

The entire project has been consolidated into **just 3 core files** so you can easily explain every single line to your faculty without any confusion or file bloat:

```
Assignment/
│
├── public/
│   ├── index.html     # HTML structure with Tailwind CSS & Vue 3 template
│   └── app.js         # The entire Vue.js frontend logic in ONE pure JavaScript file!
│
├── server.js          # The entire Node.js + Express backend, Mongoose Models, 
│                      # Socket.io Real-Time WebSockets, and REST APIs in ONE file!
│
├── package.json       # Dependencies (express, mongoose, socket.io, cors)
├── README.md          # Setup instructions
└── VIVA_GUIDE.md      # 🎓 Line-by-line explanation guide for your professor
```

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | Vue.js (100% pure JavaScript file `public/app.js`) |
| **Styling** | Tailwind CSS (simple student-level styling) |
| **Backend** | Node.js with Express JS (`server.js`) |
| **Real-Time** | Socket.io (instant order tracking & kitchen notifications) |
| **Database** | MongoDB with Mongoose |

---

## 🚀 How to Run the Project (1 Single Command!)

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

## 🎯 Features

1. **Browse Restaurants**: Search by name or filter by cuisine (*Burgers, Pizza, Biryani, Snacks*).
2. **Food Menu**: Filter Pure Veg 🟢 vs Non-Veg 🔴 dishes with price and descriptions.
3. **Cart & Checkout**: Dynamic quantity controls `[-] qty [+]` with subtotal, 5% GST, and delivery charges.
4. **Live Order Tracking**: Real-time 4-stage stepper (`Order Placed` ➔ `Preparing` ➔ `Out for Delivery` ➔ `Delivered`).
5. **Restaurant Portal (Admin)**:
   - Live incoming kitchen orders screen with one-click status buttons.
   - Advance status ➔ customer's screen updates **instantly via Socket.io** without page refresh!
   - Manage menu: toggle In-Stock / Out-of-Stock, delete dishes, or add new dishes.

---

## 🎓 Faculty Viva Preparation
Read **`VIVA_GUIDE.md`** for a clear breakdown of `server.js` and `app.js`, plus direct answers to common viva questions.
