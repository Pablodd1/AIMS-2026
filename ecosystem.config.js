// Secrets live in .env (gitignored), not in this tracked file.
require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  apps: [
    {
      name: 'aims-backend',
      script: 'index.js',
      cwd: __dirname,
      interpreter: 'node',
      env: Object.assign({}, process.env, {
        NODE_ENV: 'production',
        PORT: 4000,
      }),
    },
  ],
};
