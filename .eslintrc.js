module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  // Copied verbatim from tooling shared across repositories, so it does not follow this repo's
  // style and editing it here would make the copies drift apart silently.
  ignorePatterns: ['scripts/dev-port.mjs'],
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
    'import/prefer-default-export': 0,
    'no-param-reassign': ['error', { props: false }],
  },
};
