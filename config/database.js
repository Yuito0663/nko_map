import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Для Render PostgreSQL или внешней MySQL
const sequelize = new Sequelize(
  process.env.DATABASE_URL || // Render PostgreSQL
  `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  {
    dialect: process.env.DATABASE_URL ? 'postgres' : 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: process.env.DATABASE_URL ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  }
);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized');
    
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

export { sequelize, testConnection };