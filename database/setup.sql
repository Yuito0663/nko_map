-- Create database (если ещё не создана)
-- CREATE DATABASE cm694390_nkomap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  nkoId INT DEFAULT NULL,
  role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
  isVerified BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_nkoId (nkoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NPOs table
CREATE TABLE IF NOT EXISTS npos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category ENUM(
    'Экология',
    'Помощь животным',
    'Социальная поддержка',
    'Образование',
    'Культура',
    'Спорт',
    'Здравоохранение',
    'Другое'
  ) NOT NULL,
  description TEXT NOT NULL,
  volunteerActivities TEXT NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  website VARCHAR(500) DEFAULT NULL,
  social_vk VARCHAR(500) DEFAULT NULL,
  social_telegram VARCHAR(500) DEFAULT NULL,
  social_instagram VARCHAR(500) DEFAULT NULL,
  logo VARCHAR(500) DEFAULT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejectionReason TEXT DEFAULT NULL,
  createdBy INT NOT NULL,
  moderatedBy INT DEFAULT NULL,
  moderatedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (moderatedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_city_category (city, category),
  INDEX idx_status (status),
  INDEX idx_createdBy (createdBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint for nkoId in users table
ALTER TABLE users 
ADD CONSTRAINT fk_user_nko 
FOREIGN KEY (nkoId) REFERENCES npos(id) ON DELETE SET NULL;