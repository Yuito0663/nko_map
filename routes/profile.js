import express from 'express';
import User from '../models/User.js';
import NPO from '../models/NPO.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении профиля'
    });
  }
});

// Update user profile
router.put('/', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phone: phone || user.phone
    });

    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении профиля'
    });
  }
});

// Get user's NPOs
router.get('/npos', auth, async (req, res) => {
  try {
    const npos = await NPO.findAll({
      where: { createdBy: req.user.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: npos
    });
  } catch (error) {
    console.error('Get user NPOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении организаций'
    });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const totalNPOs = await NPO.count({
      where: { createdBy: req.user.userId }
    });

    const approvedNPOs = await NPO.count({
      where: { 
        createdBy: req.user.userId,
        status: 'approved'
      }
    });

    const pendingNPOs = await NPO.count({
      where: { 
        createdBy: req.user.userId,
        status: 'pending'
      }
    });

    res.json({
      success: true,
      data: {
        totalNPOs,
        approvedNPOs,
        pendingNPOs
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики'
    });
  }
});

export default router;