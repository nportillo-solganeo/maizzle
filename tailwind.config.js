/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [
    require('tailwindcss-preset-email'),
  ],
  content: [
    './components/**/*.html',
    './emails/**/*.html',
    './layouts/**/*.html',
  ],
  theme: {
		extend: {
			fontFamily: {
				base: ["Arial", "Helvetica", "sans-serif"],
			},
		},
	},
}
