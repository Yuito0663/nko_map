import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Для Render PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
    
    // Sync database
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized');
    
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL database:', error);
    process.exit(1);
  }
};

export { sequelize, testConnection };