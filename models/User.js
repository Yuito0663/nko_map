import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const NPO = sequelize.define('NPO', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'Экология',
      'Помощь животным',
      'Социальная поддержка',
      'Образование',
      'Культура',
      'Спорт',
      'Здравоохранение',
      'Другое'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  volunteerActivities: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  social_vk: {
    type: DataTypes.STRING,
    allowNull: true
  },
  social_telegram: {
    type: DataTypes.STRING,
    allowNull: true
  },
  social_instagram: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  moderatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  moderatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'npos',
  timestamps: true
});

export default NPO;