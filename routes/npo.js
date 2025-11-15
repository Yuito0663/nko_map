import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// In-memory storage for demo
let npos = [
  {
    id: 1,
    name: "ЭкоДом",
    category: "Экология",
    description: "Занимаемся раздельным сбором мусора и организацией экологических акций в городе.",
    volunteerActivities: "Помощь в организации акций, сортировка отходов, просветительская деятельность.",
    phone: "+7 (495) 123-45-67",
    address: "ул. Зеленая, д. 15, Ангарск",
    city: "Ангарск",
    lat: 52.5,
    lng: 103.9,
    website: "https://ecodom.ru",
    social_vk: "https://vk.com/ecodom",
    social_telegram: "https://t.me/ecodom",
    social_instagram: "https://instagram.com/ecodom",
    status: "approved",
    createdBy: 1,
    createdAt: new Date()
  },
  {
    id: 2,
    name: "Лапа помощи",
    category: "Помощь животным", 
    description: "Приют для бездомных животных, поиск новых хозяев для питомцев.",
    volunteerActivities: "Выгул животных, помощь в уборке, организация мероприятий по пристройству.",
    phone: "+7 (495) 234-56-78",
    address: "ул. Дружбы, д. 42, Балаково",
    city: "Балаково",
    lat: 52.0,
    lng: 47.8,
    website: "https://pawhelp.ru",
    social_vk: "https://vk.com/pawhelp",
    social_instagram: "https://instagram.com/pawhelp",
    status: "approved",
    createdBy: 1,
    createdAt: new Date()
  }
];

// Get all approved NPOs with filtering
router.get('/', async (req, res) => {
  try {
    const { city, category, search } = req.query;
    
    let filteredNpos = npos.filter(npo => npo.status === 'approved');

    if (city) {
      filteredNpos = filteredNpos.filter(npo => npo.city === city);
    }

    if (category) {
      filteredNpos = filteredNpos.filter(npo => npo.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredNpos = filteredNpos.filter(npo => 
        npo.name.toLowerCase().includes(searchLower) ||
        npo.description.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      count: filteredNpos.length,
      data: filteredNpos
    });
  } catch (error) {
    console.error('Get NPOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении организаций'
    });
  }
});

// Create new NPO
router.post('/', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const npoData = {
      ...req.body,
      id: npos.length + 1,
      createdBy: decoded.userId,
      status: 'pending',
      createdAt: new Date()
    };

    npos.push(npoData);

    res.status(201).json({
      success: true,
      message: 'Организация отправлена на модерацию',
      data: npoData
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