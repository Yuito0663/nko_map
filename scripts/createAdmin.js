import { sequelize } from '../config/database.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Проверяем есть ли уже админы
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      return;
    }

    // Создаем администратора
    const admin = await User.create({
      email: 'admin@nko-map.ru',
      password: 'admin123', // Сменить после первого входа!
      firstName: 'Администратор',
      lastName: 'Системы',
      role: 'admin',
      isVerified: true
    });

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@nko-map.ru');
    console.log('🔑 Password: admin123');
    console.log('⚠️ IMPORTANT: Change password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    process.exit();
  }
};

createAdmin();