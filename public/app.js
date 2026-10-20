// public/app.js
// Frontend Logic for Team Ninja Turtles Food Platform
// Pure Standard JavaScript with Vue 3 Options API

const { createApp } = Vue;

createApp({
  data() {
    return {
      currentView: 'restaurants',

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

      cart: [],
      cartRestaurant: null,
      isCartOpen: false,
      customer: {
        name: 'Rahul Sharma',
        phone: '9825123456',
        address: 'Flat 402, Green Avenue, Nirma Campus, Ahmedabad',
      },
      orders: [],

      // Real-time WebSocket State
      isSocketConnected: false,
      socket: null,
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
  },
  mounted() {
    this.fetchRestaurants();

    // Connect to Socket.io Real-time WebSocket
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Socket.io server!');
      this.isSocketConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.io server');
      this.isSocketConnected = false;
    });

    this.socket.on('orderStatusUpdated', (updatedOrder) => {
      console.log('🔔 Live Order Status Update Received:', updatedOrder);
      this.orders = this.orders.map((o) => (o._id === updatedOrder._id ? updatedOrder : o));
    });

    this.socket.on('newOrder', (newOrder) => {
      console.log('🔔 Live New Order Received:', newOrder);
      this.orders = [newOrder, ...this.orders];
    });
  },
  methods: {
    async fetchRestaurants() {
      try {
        const res = await fetch('/api/restaurants');
        this.restaurants = await res.json();
      } catch (err) {
        console.error('Failed to load restaurants:', err);
      }
    },
    async selectRestaurant(restaurant) {
      this.selectedRestaurant = restaurant;
      this.currentView = 'menu';
      this.activeCategory = 'All';
      this.vegFilter = 'all';
      try {
        const res = await fetch(`/api/restaurants/${restaurant._id}/menu`);
        this.menuItems = await res.json();
      } catch (err) {
        console.error('Failed to load menu items:', err);
      }
    },
    getItemQty(foodId) {
      const it = this.cart.find((i) => i._id === foodId);
      return it ? it.quantity : 0;
    },
    addToCart(item) {
      if (this.cartRestaurant && this.cartRestaurant._id !== this.selectedRestaurant._id) {
        if (!confirm('Cart contains items from another restaurant. Clear cart and start new order?')) {
          return;
        }
        this.cart = [];
      }
      this.cartRestaurant = this.selectedRestaurant;

      const existing = this.cart.find((i) => i._id === item._id);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.cart.push({ ...item, quantity: 1 });
      }
    },
    updateQty(foodId, delta) {
      const item = this.cart.find((i) => i._id === foodId);
      if (!item) return;

      item.quantity += delta;
      if (item.quantity <= 0) {
        this.cart = this.cart.filter((i) => i._id !== foodId);
      }
      if (this.cart.length === 0) {
        this.cartRestaurant = null;
      }
    },
    async placeOrder() {
      if (this.cart.length === 0) return;
      if (!this.customer.name || !this.customer.phone || !this.customer.address) {
        alert('Please fill out all delivery details.');
        return;
      }

      const deliveryFee = 30;
      const gst = Math.round(this.cartTotal * 0.05);
      const grandTotal = this.cartTotal + deliveryFee + gst;

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
          this.currentView = 'orders';
        }
      } catch (err) {
        alert('Failed to place order.');
      }
    },
  },
}).mount('#app');
