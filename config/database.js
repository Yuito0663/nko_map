import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Проверяем, есть ли данные для подключения
const hasDatabaseConfig = process.env.DATABASE_URL || 
                         (process.env.DB_HOST && process.env.DB_NAME);

const sequelize = hasDatabaseConfig ? new Sequelize(
  process.env.DATABASE_URL || 
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
) : null;

// Test connection - только если есть конфиг базы
const testConnection = async () => {
  if (!sequelize) {
    console.log('⚠️  Database configuration not found. Running without database.');
    return;
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized');
    
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    console.log('⚠️  Continuing without database connection');
    // Не завершаем процесс, продолжаем без базы
  }
};

export { sequelize, testConnection };