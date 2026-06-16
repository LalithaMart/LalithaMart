module.exports = {
  apps: [
    {
      name: 'ecommerce-backend',
      script: './server.js',
      instances: 'max', // Scale to max CPU cores
      exec_mode: 'cluster', // Enables clustering
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      }
    }
  ]
};
