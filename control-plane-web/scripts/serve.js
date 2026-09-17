const { spawn } = require('child_process')
const path = require('path')

const port = process.env.SCP_WEB_PORT || '5174'
const extra = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''
const env = {
  ...process.env,
  NODE_OPTIONS: `${extra}--openssl-legacy-provider`.trim(),
}

const ng = path.join(__dirname, '..', 'node_modules', '.bin', 'ng')
const child = spawn(
  ng,
  [
    'serve',
    '--proxy-config',
    'proxy.conf.js',
    '--port',
    String(port),
    '--host',
    '127.0.0.1',
    '--disable-host-check',
    '--open=false',
  ],
  {
    stdio: 'inherit',
    env,
    cwd: path.join(__dirname, '..'),
    shell: process.platform === 'win32',
  },
)

child.on('exit', (code) => process.exit(code || 0))
