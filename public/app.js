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
    selectRestaurant(restaurant) {
      console.log('Selected:', restaurant.name);
    },
  },
}).mount('#app');
