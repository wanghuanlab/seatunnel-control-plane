const apiPort = process.env.SCP_PORT || 8800

module.exports = {
  '/api': {
    target: `http://127.0.0.1:${apiPort}`,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
}
