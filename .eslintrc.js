module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 0,
    'no-unused-vars': 1,
    'import/no-extraneous-dependencies': ['error', { devDependencies: true, optionalDependencies: true, peerDependencies: true }],
    'import/no-cycle': [2, { maxDepth: 1 }],
    'import/prefer-default-export': 0,
    'no-param-reassign': ['error', { props: false }],
  },
};
