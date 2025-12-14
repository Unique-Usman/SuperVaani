module.exports = {
  apps: [{
    name: 'nextjs-app',
    script: 'npm',
    args: 'start',
    cwd: '/home/anupam/SuperVaani/app',
    env: {
      NODE_ENV: 'production',
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
      PORT: 3000
    }
  }]
}
