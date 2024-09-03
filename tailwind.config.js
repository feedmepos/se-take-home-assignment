/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['selector', '[data-mantine-color-scheme="dark"]'],
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {},
    },
    plugins: ['prettier-plugin-tailwindcss'],
};
