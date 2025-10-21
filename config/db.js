const { Sequelize } = require('sequelize');

// Explicitly require pg
require('pg');
require('pg-hstore');

const sequelize = new Sequelize('neondb', 'neondb_owner', 'npg_7fsbyUw2rLcX', {
  host: 'ep-sweet-poetry-ae6qxj09-pooler.c-2.us-east-2.aws.neon.tech',
  port: 5432,
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false,
});

module.exports = sequelize;
