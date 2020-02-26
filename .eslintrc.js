module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:node/recommended",
    "plugin:prettier/recommended"
  ],
  "rules": {
    // We use labels for our own purposes here
    "no-unused-labels": 0,
    "no-undef": 0,
    "no-with": 0
  },
  "overrides": [
    {
      "files": [
        "**/__tests__/**/*"
      ],
      rules: {
        // Tests will require dev only packages
        "node/no-unpublished-require": 0
      }
    }
  ]
}