import express from 'express';
import NPO from '../models/NPO.js';
import { auth } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all approved NPOs with filtering
router.get('/', async (req, res) => {
  try {
    const { city, category, search } = req.query;
    const where = { status: 'approved' };

    if (city) where.city = city;
    if (category) where.category = category;
    
    let searchCondition = {};
    if (search) {
      searchCondition = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    const npos = await NPO.findAll({
      where: { ...where, ...searchCondition },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: npos.length,
      data: npos
    });
  } catch (error) {
    console.error('Get NPOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении организаций'
    });
  }
});

// Create new NPO (requires auth)
router.post('/', auth, async (req, res) => {
  try {
    const npoData = {
      ...req.body,
      createdBy: req.user.userId,
      status: 'pending' // Все новые НКО требуют модерации
    };

    const npo = await NPO.create(npoData);

    res.status(201).json({
      success: true,
      message: 'Организация отправлена на модерацию. Вы получите уведомление после проверки.',
      data: npo
    });
  } catch (error) {
    console.error('Create NPO error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании организации'
    });
  }
});

export default router;