module.exports = {
    root: true,
    env: {
        browser: true,
        es6: true,
        webextensions: true
    },
    parserOptions: {
        ecmaVersion: 2022
    },
    extends: [
        'plugin:vue/vue3-essential',
        '@vue/standard'
    ],
    rules: {
        indent: ['error', 4, {SwitchCase: 1}],
        'generator-star-spacing': 'off',
        'no-throw-literal': 'off',
        'no-return-assign': 'off',
        'no-return-await': 'off',
        'no-callback-literal': 'off',
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    }
}
