import express from 'express';
import NPO from '../models/NPO.js';
import User from '../models/User.js';
import { auth, adminAuth } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all NPOs for moderation
router.get('/npos', auth, adminAuth, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;

    const npos = await NPO.findAndCountAll({
      where: { status },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: npos.rows,
      total: npos.count,
      page: parseInt(page),
      totalPages: Math.ceil(npos.count / limit)
    });
  } catch (error) {
    console.error('Get NPOs for moderation error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении организаций для модерации'
    });
  }
});

// Approve NPO
router.patch('/npos/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const npo = await NPO.findByPk(req.params.id);
    
    if (!npo) {
      return res.status(404).json({
        success: false,
        message: 'Организация не найдена'
      });
    }

    await npo.update({
      status: 'approved',
      moderatedBy: req.user.userId,
      moderatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Организация одобрена и опубликована на карте',
      data: npo
    });
  } catch (error) {
    console.error('Approve NPO error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при одобрении организации'
    });
  }
});

// Reject NPO
router.patch('/npos/:id/reject', auth, adminAuth, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const npo = await NPO.findByPk(req.params.id);
    
    if (!npo) {
      return res.status(404).json({
        success: false,
        message: 'Организация не найдена'
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Укажите причину отклонения'
      });
    }

    await npo.update({
      status: 'rejected',
      rejectionReason,
      moderatedBy: req.user.userId,
      moderatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Организация отклонена',
      data: npo
    });
  } catch (error) {
    console.error('Reject NPO error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отклонении организации'
    });
  }
});

// Get admin statistics
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalNPOs = await NPO.count();
    const approvedNPOs = await NPO.count({ where: { status: 'approved' } });
    const pendingNPOs = await NPO.count({ where: { status: 'pending' } });
    const rejectedNPOs = await NPO.count({ where: { status: 'rejected' } });
    const totalUsers = await User.count();
    const adminUsers = await User.count({ where: { role: 'admin' } });

    res.json({
      success: true,
      data: {
        npos: {
          total: totalNPOs,
          approved: approvedNPOs,
          pending: pendingNPOs,
          rejected: rejectedNPOs
        },
        users: {
          total: totalUsers,
          admins: adminUsers,
          regular: totalUsers - adminUsers
        }
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики'
    });
  }
});

// Get all users (for admin)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const users = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: users.rows,
      total: users.count,
      page: parseInt(page),
      totalPages: Math.ceil(users.count / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении пользователей'
    });
  }
});

export default router;