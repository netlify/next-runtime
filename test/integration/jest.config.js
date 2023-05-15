module.exports = {
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  verbose: true,
  testTimeout: 60000,
  maxWorkers: 1,
}
