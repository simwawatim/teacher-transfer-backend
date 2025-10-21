const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'neondb',                // database name
  'neondb_owner',          // username
  'npg_7fsbyUw2rLcX',      // password
  {
    host: 'ep-sweet-poetry-ae6qxj09-pooler.c-2.us-east-2.aws.neon.tech', // Neon host
    port: 5432,            // default PostgreSQL port
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Neon SSL
      },
    },
    logging: false, // turn off SQL logging
  }
);

// Test connection immediately
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully.');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err);
  }
})();

module.exports = sequelize;
