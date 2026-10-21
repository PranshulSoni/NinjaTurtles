// public/app.js
// Complete Vue.js Frontend Logic for Team Ninja Turtles Food Platform
// 100% Pure Standard JavaScript with Vue 3 Options API

const { createApp } = Vue;

createApp({
  data() {
    return {
      // Navigation
      currentView: 'restaurants', // 'restaurants', 'menu', 'orders', 'restaurant-admin'

      // Restaurant Catalogue Data
      restaurants: [],
      searchTerm: '',
      selectedCuisine: 'All',
      cuisines: ['All', 'Burgers', 'Pizza', 'Biryani', 'Snacks', 'Fast Food'],

      // Menu Data
      selectedRestaurant: null,
      menuItems: [],
      vegFilter: 'all', // 'all', 'veg', 'non-veg'
      activeCategory: 'All',

      // Orders
      orders: [],

      // Cart State
      cart: [],
      cartRestaurant: null,
      isCartOpen: false,
      customer: {
        name: 'Rahul Sharma',
        phone: '9825123456',
        address: 'Flat 402, Green Avenue, Nirma Campus, Ahmedabad',
      },

      // Database & Socket Status
      isDbConnected: true,
      isSocketConnected: false,
      socket: null,

      // Restaurant Partner Portal (Admin)
      adminSelectedRestaurantId: '',
      adminTab: 'orders', // 'orders' or 'menu'
      adminMenuItems: [],
      newDish: {
        name: '',
        price: '',
        category: 'Main Course',
        isVeg: true,
        description: '',
      },
    };
  },

  computed: {
    cartCount() {
      return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    },
    cartTotal() {
      return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },
    activeOrdersCount() {
      return this.orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
    },
    filteredRestaurants() {
      return this.restaurants.filter((r) => {
        const matchesSearch =
          r.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          r.cuisine.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          r.address.toLowerCase().includes(this.searchTerm.toLowerCase());
        const matchesCuisine =
          this.selectedCuisine === 'All' ||
          r.cuisine.toLowerCase().includes(this.selectedCuisine.toLowerCase());
        return matchesSearch && matchesCuisine;
      });
    },
    menuCategories() {
      return ['All', ...new Set(this.menuItems.map((i) => i.category || 'Main Course'))];
    },
    filteredMenuItems() {
      return this.menuItems.filter((i) => {
        const matchesCat = this.activeCategory === 'All' || i.category === this.activeCategory;
        const matchesDiet =
          this.vegFilter === 'all' ||
          (this.vegFilter === 'veg' && i.isVeg) ||
          (this.vegFilter === 'non-veg' && !i.isVeg);
        return matchesCat && matchesDiet;
      });
    },
    adminRestaurantOrders() {
      return this.orders.filter(
        (o) => o.restaurantId === this.adminSelectedRestaurantId
      );
    },
  },

  mounted() {
    // 1. Fetch initial restaurants and orders
    this.fetchRestaurants();
    this.fetchOrders();

    // 2. Connect to Socket.io Real-time WebSocket
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Socket.io server!');
      this.isSocketConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.io server');
      this.isSocketConnected = false;
    });

    // 🚀 LISTEN TO REAL-TIME ORDER STATUS UPDATES:
    // When the restaurant kitchen changes status, update client state live!
    this.socket.on('orderStatusUpdated', (updatedOrder) => {
      console.log('🔔 Live Order Status Update Received:', updatedOrder);
      this.orders = this.orders.map((o) => (o._id === updatedOrder._id ? updatedOrder : o));
    });

    // 🚀 LISTEN TO NEW INCOMING ORDERS:
    // When any order is placed, prepend to orders array live!
    this.socket.on('newOrder', (newOrder) => {
      console.log('🔔 Live New Order Received:', newOrder);
      this.orders = [newOrder, ...this.orders];
    });
  },

  methods: {
    // API: Fetch Restaurants
    async checkDbHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        this.isDbConnected = !!data.dbConnected;
      } catch (e) {
        this.isDbConnected = false;
      }
    },
    async fetchRestaurants() {
      try {
        const res = await fetch('/api/restaurants');
        const data = await res.json();
        this.restaurants = Array.isArray(data) ? data : [];
        if (this.restaurants.length > 0 && !this.adminSelectedRestaurantId) {
          this.adminSelectedRestaurantId = this.restaurants[0]._id;
          this.fetchAdminMenu();
        }
      } catch (err) {
        console.error('Error fetching restaurants:', err);
      }
    },

    // API: Fetch Orders
    async fetchOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        this.orders = Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Error fetching orders:', err);
      }
    },

    // Select restaurant to browse menu
    async selectRestaurant(restaurant) {
      this.selectedRestaurant = restaurant;
      this.currentView = 'menu';
      try {
        const res = await fetch(`/api/restaurants/${restaurant._id}/menu`);
        const data = await res.json();
        this.menuItems = Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Error fetching menu:', err);
      }
    },

    // Cart: Get item quantity
    getItemQuantity(dishId) {
      const found = this.cart.find((c) => c._id === dishId);
      return found ? found.quantity : 0;
    },

    // Cart: Add to cart
    addToCart(dish, restaurant) {
      if (this.cartRestaurant && this.cartRestaurant._id !== restaurant._id && this.cart.length > 0) {
        const ok = window.confirm(
          `Your cart contains items from "${this.cartRestaurant.name}". Reset cart for "${restaurant.name}"?`
        );
        if (!ok) return;
        this.cart = [{ ...dish, quantity: 1 }];
        this.cartRestaurant = restaurant;
        return;
      }
      this.cartRestaurant = restaurant;
      const found = this.cart.find((i) => i._id === dish._id);
      if (found) {
        found.quantity += 1;
      } else {
        this.cart.push({ ...dish, quantity: 1 });
      }
    },

    // Cart: Update quantity
    updateCartQuantity(dishId, newQty) {
      if (newQty <= 0) {
        this.cart = this.cart.filter((i) => i._id !== dishId);
        if (this.cart.length === 0) this.cartRestaurant = null;
      } else {
        const found = this.cart.find((i) => i._id === dishId);
        if (found) found.quantity = newQty;
      }
    },

    // Cart: Place Order
    async placeOrder() {
      if (this.cart.length === 0) return;
      const grandTotal = this.cartTotal + 30 + Math.round(this.cartTotal * 0.05);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: this.customer.name,
            customerPhone: this.customer.phone,
            deliveryAddress: this.customer.address,
            restaurantId: this.cartRestaurant._id,
            restaurantName: this.cartRestaurant.name,
            items: this.cart.map((i) => ({
              foodItemId: i._id,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
            })),
            totalAmount: grandTotal,
          }),
        });

        if (res.ok) {
          const placed = await res.json();
          this.orders = [placed, ...this.orders];
          this.cart = [];
          this.cartRestaurant = null;
          this.isCartOpen = false;
          this.currentView = 'orders'; // Jump to real-time tracking
        }
      } catch (err) {
        alert('Failed to place order.');
      }
    },

    // Stepper Helper
    getStatusStepIndex(status) {
      const stages = ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
      return stages.indexOf(status);
    },

    // Admin: Fetch menu for selected restaurant
    async fetchAdminMenu() {
      if (!this.adminSelectedRestaurantId) return;
      try {
        const res = await fetch(`/api/restaurants/${this.adminSelectedRestaurantId}/menu`);
        const data = await res.json();
        this.adminMenuItems = Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Error fetching admin menu:', err);
      }
    },

    // Admin: Update order status (triggers real-time socket event)
    async updateOrderStatus(orderId, newStatus) {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          const updated = await res.json();
          this.orders = this.orders.map((o) => (o._id === updated._id ? updated : o));
        }
      } catch (err) {
        console.error('Error updating status:', err);
      }
    },

    // Admin: Toggle dish in-stock / out-of-stock
    async toggleStock(dishId) {
      try {
        const res = await fetch(`/api/menu/${dishId}/toggle`, { method: 'PATCH' });
        if (res.ok) {
          const updated = await res.json();
          this.adminMenuItems = this.adminMenuItems.map((d) => (d._id === dishId ? updated : d));
        }
      } catch (err) {
        console.error('Error toggling stock:', err);
      }
    },

    // Admin: Delete dish
    async deleteDish(dishId) {
      if (!confirm('Delete this dish?')) return;
      try {
        const res = await fetch(`/api/menu/${dishId}`, { method: 'DELETE' });
        if (res.ok) {
          this.adminMenuItems = this.adminMenuItems.filter((d) => d._id !== dishId);
        }
      } catch (err) {
        console.error('Error deleting dish:', err);
      }
    },

    // Admin: Add new dish
    async addNewDish() {
      if (!this.newDish.name || !this.newDish.price) return;
      try {
        const res = await fetch(`/api/restaurants/${this.adminSelectedRestaurantId}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.newDish.name,
            price: Number(this.newDish.price),
            category: this.newDish.category,
            isVeg: this.newDish.isVeg,
            description: this.newDish.description || 'Delicious dish',
          }),
        });
        if (res.ok) {
          const created = await res.json();
          this.adminMenuItems.push(created);
          this.newDish.name = '';
          this.newDish.price = '';
          this.newDish.description = '';
        }
      } catch (err) {
        console.error('Error adding dish:', err);
      }
    },

    // Image fallback error handlers
    handleRestaurantImageError(event) {
      event.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600';
    },

    handleFoodImageError(event) {
      event.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
    },
  },
}).mount('#app');
