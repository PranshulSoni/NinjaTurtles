// public/app.js
// Frontend Logic for Team Ninja Turtles Food Platform
// Pure Standard JavaScript with Vue 3 Options API

const { createApp } = Vue;

createApp({
  data() {
    return {
      currentView: 'restaurants',
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
  },
  mounted() {
    console.log('Ninja Turtles navigation initialized');
  },
}).mount('#app');
