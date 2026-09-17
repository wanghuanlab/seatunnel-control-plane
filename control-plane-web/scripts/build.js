const { spawn } = require('child_process')
const path = require('path')

const configuration = process.argv[2] || 'production'
const extra = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''
const env = {
  ...process.env,
  NODE_OPTIONS: `${extra}--openssl-legacy-provider`.trim(),
}

const ng = path.join(__dirname, '..', 'node_modules', '.bin', 'ng')
const child = spawn(ng, ['build', '--configuration', configuration], {
  stdio: 'inherit',
  env,
  cwd: path.join(__dirname, '..'),
  shell: process.platform === 'win32',
})

child.on('exit', (code) => process.exit(code || 0))
