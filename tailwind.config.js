module.exports = {
  mode: 'jit',
  purge: [
    './src/**/*.{vue,js,ts,jsx,tsx}',
    // Add any other files that contain HTML, JS, CSS, or Vue templates
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      screens: {
        "xs": '400px',
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}