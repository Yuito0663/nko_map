import express from 'express';
import NPO from '../models/NPO.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

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
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const npos = await NPO.findAll({
      where: { ...where, ...searchCondition },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['firstName', 'lastName']
      }],
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
      status: 'pending'
    };

    // Check if user already has an NPO
    const existingUser = await User.findByPk(req.user.userId);
    if (existingUser.nkoId) {
      return res.status(400).json({
        success: false,
        message: 'Вы уже создали организацию. К одному аккаунту может быть привязана только одна НКО.'
      });
    }

    const npo = await NPO.create(npoData);

    // Link NPO to user
    await User.update(
      { nkoId: npo.id },
      { where: { id: req.user.userId } }
    );

    res.status(201).json({
      success: true,
      message: 'Организация отправлена на модерацию',
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