

const { createApp } = Vue;

createApp({
  data() {
    return {
      // Navigation (Defaults to 'login' gate until authenticated)
      currentView: 'login', // 'login', 'restaurants', 'menu', 'orders', 'restaurant-admin'

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

      // Database Status
      isDbConnected: true,
      dbName: 'food_delivery_db',

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

      // Authentication & Role-Based Access Control (RBAC)
      currentUser: null,
      authToken: '',
      authModalOpen: false,
      authMode: 'login', // 'login' or 'register'
      authError: '',
      authSuccess: '',
      authLoading: false,
      loginForm: {
        email: '',
        password: '',
      },
      registerForm: {
        name: '',
        userId: '',
        email: '',
        password: '',
        role: 'customer', // 'customer' or 'admin'
        phone: '',
        address: '',
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
    // 0. Restore Auth session from localStorage
    try {
      const savedUser = localStorage.getItem('ninja_user');
      const savedToken = localStorage.getItem('ninja_token');
      if (savedUser && savedToken) {
        this.currentUser = JSON.parse(savedUser);
        this.authToken = savedToken;
        if (this.currentUser.name) {
          this.customer.name = this.currentUser.name;
          this.customer.phone = this.currentUser.phone || this.customer.phone;
          this.customer.address = this.currentUser.address || this.customer.address;
        }
        // Direct to appropriate initial view based on role
        if (this.currentUser.role === 'admin') {
          this.currentView = 'restaurant-admin';
        } else {
          this.currentView = 'restaurants';
        }
        this.fetchOrders();
      } else {
        this.currentView = 'login';
      }
    } catch (e) {
      console.warn('Could not restore auth session:', e);
      this.currentView = 'login';
    }

    // Fetch initial restaurants catalog and health
    this.checkDbHealth();
    this.fetchRestaurants();

    // Auto-refresh orders every 5s if user is logged in and viewing orders or tracking active deliveries
    setInterval(() => {
      if (this.currentUser && (this.currentView === 'orders' || this.activeOrdersCount > 0)) {
        this.fetchOrders();
      }
    }, 5000);
  },

  methods: {
    // API: Fetch Restaurants
    async checkDbHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        this.isDbConnected = !!data.dbConnected;
        if (data.database) this.dbName = data.database;
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

    // API: Fetch Orders for current logged in user
    async fetchOrders() {
      if (!this.currentUser) {
        this.orders = [];
        return;
      }
      try {
        let url = '/api/orders';
        if (this.currentUser.role === 'customer') {
          url += `?userId=${this.currentUser.id || this.currentUser._id}`;
        }
        const res = await fetch(url);
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
            userId: this.currentUser ? (this.currentUser.id || this.currentUser._id) : '',
            userEmail: this.currentUser ? this.currentUser.email : '',
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

    // Admin: Update order status
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
        const headers = {};
        if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
        const res = await fetch(`/api/menu/${dishId}/toggle`, { method: 'PATCH', headers });
        if (res.ok) {
          const updated = await res.json();
          this.adminMenuItems = this.adminMenuItems.map((d) => (d._id === dishId ? updated : d));
        } else {
          const errData = await res.json();
          alert(errData.error || 'Failed to toggle stock');
        }
      } catch (err) {
        console.error('Error toggling stock:', err);
      }
    },

    // Admin: Delete dish
    async deleteDish(dishId) {
      if (!confirm('Delete this dish?')) return;
      try {
        const headers = {};
        if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
        const res = await fetch(`/api/menu/${dishId}`, { method: 'DELETE', headers });
        if (res.ok) {
          this.adminMenuItems = this.adminMenuItems.filter((d) => d._id !== dishId);
        } else {
          const errData = await res.json();
          alert(errData.error || 'Failed to delete dish');
        }
      } catch (err) {
        console.error('Error deleting dish:', err);
      }
    },

    // Admin: Add new dish
    async addNewDish() {
      if (!this.newDish.name || !this.newDish.price) return;
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
        const res = await fetch(`/api/restaurants/${this.adminSelectedRestaurantId}/menu`, {
          method: 'POST',
          headers,
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
        } else {
          const errData = await res.json();
          alert(errData.error || 'Failed to add dish');
        }
      } catch (err) {
        console.error('Error adding dish:', err);
      }
    },

    // ==========================================
    // AUTHENTICATION & RBAC METHODS
    // ==========================================

    openAuthModal(mode = 'login') {
      this.authMode = mode;
      this.authError = '';
      this.authSuccess = '';
      this.authModalOpen = true;
    },

    closeAuthModal() {
      this.authModalOpen = false;
      this.authError = '';
      this.authSuccess = '';
    },

    setAuthSession(user, token) {
      this.currentUser = user;
      this.authToken = token;
      localStorage.setItem('ninja_user', JSON.stringify(user));
      localStorage.setItem('ninja_token', token);

      if (user.name) this.customer.name = user.name;
      if (user.phone) this.customer.phone = user.phone;
      if (user.address) this.customer.address = user.address;

      // Role-Based Access Control Redirection:
      // If Admin -> automatically navigate to Restaurant Partner Portal
      // If Customer -> navigate to Order Food view
      if (user.role === 'admin') {
        this.currentView = 'restaurant-admin';
        if (this.restaurants.length > 0 && !this.adminSelectedRestaurantId) {
          this.adminSelectedRestaurantId = this.restaurants[0]._id;
        }
        this.fetchAdminMenu();
      } else {
        this.currentView = 'restaurants';
      }
      this.fetchOrders();
    },

    async handleLogin() {
      this.authError = '';
      this.authLoading = true;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.loginForm),
        });
        const data = await res.json();
        if (res.ok) {
          this.setAuthSession(data.user, data.token);
          this.closeAuthModal();
        } else {
          this.authError = data.error || 'Invalid credentials.';
        }
      } catch (err) {
        this.authError = 'Network error while attempting login.';
      } finally {
        this.authLoading = false;
      }
    },

    async handleRegister() {
      this.authError = '';
      this.authLoading = true;
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.registerForm),
        });
        const data = await res.json();
        if (res.ok) {
          this.setAuthSession(data.user, data.token);
          this.closeAuthModal();
        } else {
          this.authError = data.error || 'Registration failed.';
        }
      } catch (err) {
        this.authError = 'Network error during registration.';
      } finally {
        this.authLoading = false;
      }
    },

    handleLogout() {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
      this.currentUser = null;
      this.authToken = '';
      localStorage.removeItem('ninja_user');
      localStorage.removeItem('ninja_token');
      this.currentView = 'login';
      this.cart = [];
      this.orders = [];
    },

    navigateWithRoleCheck(view) {
      if (!this.currentUser) {
        this.currentView = 'login';
        this.authError = 'Please sign in to access the platform.';
        return;
      }
      if (view === 'restaurant-admin') {
        if (this.currentUser.role !== 'admin') {
          this.authError = 'Role Restriction: Your account has Customer privileges. Please log in as an Admin.';
          this.openAuthModal('login');
          return;
        }
      }
      this.currentView = view;
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
