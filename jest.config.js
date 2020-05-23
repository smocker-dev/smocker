module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // see: https://stackoverflow.com/a/54117206
  moduleNameMapper: {
    "^lodash-es$": "lodash",
  },
};
