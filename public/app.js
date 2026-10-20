// public/app.js
// Frontend Logic for Team Ninja Turtles Food Platform
// Pure Standard JavaScript with Vue 3 Options API

const { createApp } = Vue;

createApp({
  data() {
    return {
      appName: 'Ninja Turtles Food Platform',
    };
  },
  mounted() {
    console.log('Ninja Turtles Vue App initialized');
  },
}).mount('#app');
