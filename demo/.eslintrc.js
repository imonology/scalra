module.exports = {
	root: true,
	env: {
		node: true
	},
	extends: ['plugin:vue/essential', '@vue/prettier'],
	globals: {
		UTIL: {},
		SR: {},
		LOG: {}
	},
	rules: {
		'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		indent: ['error', 'tab', { SwitchCase: 0 }],
		quotes: ['error', 'single'],
		'prettier/prettier': ['error', { singleQuote: true }],
		semi: ['error', 'always'],
		'brace-style': ['error', '1tbs', { allowSingleLine: true }],
		'no-unused-vars': [
			'warn',
			{
				vars: 'all',
				args: 'after-used',
				ignoreRestSiblings: false
			}
		],
		'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
		'no-trailing-spaces': [
			2,
			{
				skipBlankLines: false,
				ignoreComments: false
			}
		]
	},
	parserOptions: {
		parser: 'babel-eslint'
	}
};
