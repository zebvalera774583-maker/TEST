module.exports = {
  apps: [{
    name: 'ashot-zebelyan',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/ashot-zebelyan',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

