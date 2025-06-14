/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'indigo-deep': '#1e3a8a',  // Deep Indigo Blue
        'orange-vibrant': '#f97316',  // Vibrant Orange
        'purple-rich': '#7c3aed',  // Rich Purple
        'red-sale': '#ef4444',  // Sale Red
        'green-success': '#10b981',  // Success Green
        'gray-warning': '#6b7280',  // Warning Gray
        'blue-light': '#dbeafe',  // Light Blue
        'gray-warm': '#f3f4f6',  // Warm Gray
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'heading': ['Poppins', 'system-ui', 'sans-serif'],
        'denim': ['Bebas Neue', 'cursive'],
      },
    },
  },
  plugins: [],
} 