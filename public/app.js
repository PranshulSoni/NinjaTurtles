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
      orders: [],
      isCartOpen: false,
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
    addToCart(dish) {
      console.log('Add to cart:', dish.name);
    },
    getItemQty(dishId) {
      const found = this.cart.find((i) => i._id === dishId);
      return found ? found.quantity : 0;
    },
    updateQty(dishId, delta) {
      console.log('Update qty:', dishId, delta);
    },
  },
}).mount('#app');
