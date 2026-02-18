/*
|-------------------------------------------------------------------------------
| Production config                       https://maizzle.com/docs/environments
|-------------------------------------------------------------------------------
|
| This is the production configuration that Maizzle will use when you run the
| `npm run build` command. Settings here will be merged on top of the base
| `config.js`, so you only need to add the options that are changing.
|
*/

/** @type {import('@maizzle/framework').Config} */
export default {
  build: {
    output: {
      path: 'build_production',
    },
  },
  css: {
		inline: {
			styleToAttribute: {
				width: "width",
				height: "height",
				"background-color": "bgcolor",
				"text-align": "align",
				"vertical-align": "valign",
			},
		},
		shorthand: true,
	},
	minify: {
		html: {
			lineLengthLimit: 500,
			removeIndentations: true,
			breakToTheLeftOf: [],
		},
	},
  prettify: true,
}
