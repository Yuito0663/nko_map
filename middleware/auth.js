import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware для проверки JWT токена
 * Добавляет пользователя в req.user если токен валиден
 */
const auth = async (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Доступ запрещен. Токен отсутствует или имеет неверный формат.'
      });
    }

    // Извлекаем токен (убираем 'Bearer ')
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Доступ запрещен. Токен отсутствует.'
      });
    }

    // Проверяем и декодируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // Ищем пользователя в базе данных
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Добавляем информацию о пользователе в запрос
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Переходим к следующему middleware/обработчику
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Обрабатываем разные типы JWT ошибок
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Неверный токен'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Токен истек'
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Токен еще не активен'
      });
    }

    // Любая другая ошибка
    res.status(500).json({
      success: false,
      message: 'Ошибка аутентификации'
    });
  }
};

/**
 * Middleware для проверки роли администратора
 * Должен использоваться ПОСЛЕ основного auth middleware
 */
const adminAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Требуется роль администратора.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки прав доступа'
    });
  }
};

/**
 * Middleware для проверки роли модератора или администратора
 */
const moderatorAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация'
      });
    }

    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Требуется роль модератора или администратора.'
      });
    }

    next();
  } catch (error) {
    console.error('Moderator auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки прав доступа'
    });
  }
};

/**
 * Optional auth middleware - не блокирует запрос если нет токена,
 * но добавляет пользователя в req.user если токен валиден
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        const user = await User.findByPk(decoded.userId);
        
        if (user) {
          req.user = {
            userId: user.id,
            email: user.email,
            role: user.role
          };
        }
      }
    }

    next();
  } catch (error) {
    // В optional auth мы не блокируем запрос при ошибках аутентификации
    // Просто продолжаем без пользователя
    console.log('Optional auth error (non-blocking):', error.message);
    next();
  }
};

export { auth, adminAuth, moderatorAuth, optionalAuth };
export default auth;