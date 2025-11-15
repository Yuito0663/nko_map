// Configuration for Render
const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:10000/api' 
        : '/api',
    DOMAIN: window.location.hostname,
    YANDEX_MAPS_API_KEY: '850ebf56-d22c-48f6-8bb6-01602cc24abf',
    CITIES: [
        'Ангарск', 'Байкальск', 'Балаково', 'Билибино', 'Волгодонск',
        'Глазов', 'Десногорск', 'Димитровград', 'Железногорск', 'Заречный',
        'Зеленогорск', 'Краснокаменск', 'Курчатов', 'Лесной', 'Неман',
        'Нововоронеж', 'Новоуральск', 'Обнинск', 'Озерск', 'Певек',
        'Полярные Зори', 'Саров', 'Северск', 'Снежинск', 'Советск',
        'Сосновый Бор', 'Трехгорный', 'Удомля', 'Усолье-Сибирское',
        'Электросталь', 'Энергодар'
    ],
    CATEGORIES: [
        'Экология',
        'Помощь животным',
        'Социальная поддержка',
        'Образование',
        'Культура',
        'Спорт',
        'Здравоохранение',
        'Другое'
    ],
    ROLES: {
        USER: 'user',
        ADMIN: 'admin'
    }
};

// Application state
const state = {
    currentUser: null,
    authToken: localStorage.getItem('authToken'),
    npos: [],
    map: null,
    markers: [],
    selectedNPO: null
};

// API service
const apiService = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
            mode: 'cors',
        };

        if (state.authToken) {
            config.headers.Authorization = `Bearer ${state.authToken}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API Error ${response.status}:`, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ API Success: ${options.method || 'GET'} ${url}`);
            return data;
            
        } catch (error) {
            console.error('❌ API request failed:', error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.');
            }
            
            throw error;
        }
    },

    // Auth methods
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData,
        });
    },

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials,
        });
    },

    async getCurrentUser() {
        return this.request('/auth/me');
    },

    // NPO methods
    async getNPOs(filters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        
        const query = params.toString();
        const endpoint = query ? `/npo?${query}` : '/npo';
        return this.request(endpoint);
    },

    async createNPO(npoData) {
        return this.request('/npo', {
            method: 'POST',
            body: npoData,
        });
    },

    // Profile methods
    async getProfile() {
        return this.request('/profile');
    },

    async getProfileStats() {
        return this.request('/profile/stats');
    },

    async getUserNPOs() {
        return this.request('/profile/npos');
    },

    // Admin methods
    async getModerationNPOs(status = 'pending') {
        return this.request(`/admin/npos?status=${status}`);
    },

    async getAdminStats() {
        return this.request('/admin/stats');
    },

    async getUsers() {
        return this.request('/admin/users');
    },

    async approveNPO(npoId) {
        return this.request(`/admin/npos/${npoId}/approve`, {
            method: 'PATCH'
        });
    },

    async rejectNPO(npoId, reason) {
        return this.request(`/admin/npos/${npoId}/reject`, {
            method: 'PATCH',
            body: { rejectionReason: reason }
        });
    }
};

// Map service for 2GIS
const mapService = {
    map: null,
    markers: [],
    isInitialized: false,

    init() {
        try {
            console.log('🗺️ Initializing 2GIS Map...');
            
            // Очищаем контейнер карты
            const mapContainer = document.getElementById('map');
            mapContainer.innerHTML = '';

            // Инициализация карты 2GIS
            this.map = new DG.Map('map', {
                center: [55.75, 37.62],
                zoom: 5,
                geoclicker: false
            });

            this.isInitialized = true;
            console.log('✅ 2GIS Map initialized successfully');

        } catch (error) {
            console.error('❌ Error initializing 2GIS Map:', error);
        }
    },

    addMarker(npo) {
        if (!this.map || !this.isInitialized) {
            console.warn('⚠️ Map not ready, skipping marker:', npo.name);
            return null;
        }

        try {
            // Создаем метку с кастомной иконкой
            const marker = DG.marker([parseFloat(npo.lat), parseFloat(npo.lat)])
                .addTo(this.map)
                .bindPopup(`
                    <div style="min-width: 250px; padding: 10px;">
                        <h4 style="margin: 0 0 8px 0; color: #006CB7;">${this.escapeHtml(npo.name)}</h4>
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #777;">
                            <strong>Категория:</strong> ${this.escapeHtml(npo.category)}
                        </p>
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #777;">
                            <strong>Город:</strong> ${this.escapeHtml(npo.city)}
                        </p>
                        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;">
                            ${this.escapeHtml(npo.description.substring(0, 120))}...
                        </p>
                        <button onclick="app.showNpoCard(${npo.id})" 
                                style="padding: 8px 16px; background: #006CB7; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                            Подробнее
                        </button>
                    </div>
                `);

            // Устанавливаем иконку в зависимости от категории
            this.setMarkerIcon(marker, npo.category);

            // Сохраняем ссылку на маркер
            marker.npoId = npo.id;
            this.markers.push(marker);

            // Обработчик клика по метке
            marker.on('click', () => {
                app.showNpoCard(npo.id);
            });

            return marker;

        } catch (error) {
            console.error('❌ Error adding marker:', error);
            return null;
        }
    },

    // Установка иконки маркера по категории
    setMarkerIcon(marker, category) {
        const colors = {
            'Экология': '#28a745',
            'Помощь животным': '#ffc107', 
            'Социальная поддержка': '#dc3545',
            'Образование': '#007bff',
            'Культура': '#6f42c1',
            'Спорт': '#fd7e14',
            'Здравоохранение': '#e83e8c',
            'Другое': '#6c757d'
        };

        const color = colors[category] || '#006CB7';
        
        // Создаем кастомную иконку
        marker.setIcon({
            iconUrl: this.createMarkerIcon(color),
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    },

    // Создание SVG иконки для маркера
    createMarkerIcon(color) {
        const svg = `
            <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C9.477 0 5 4.477 5 10c0 5.523 4.477 10 10 10s10-4.477 10-10C25 4.477 20.523 0 15 0z" 
                      fill="${color}" stroke="#ffffff" stroke-width="2"/>
                <circle cx="15" cy="10" r="3" fill="#ffffff"/>
            </svg>
        `;
        return 'data:image/svg+xml;base64,' + btoa(svg);
    },

    // Экранирование HTML для безопасности
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    clearMarkers() {
        if (this.markers.length > 0) {
            this.markers.forEach(marker => {
                if (marker && marker.remove) {
                    marker.remove();
                }
            });
            this.markers = [];
        }
    },

    updateMarkers(npos) {
        if (!this.isInitialized) {
            console.warn('⚠️ Map not initialized, skipping markers update');
            return;
        }

        console.log(`📍 Updating ${npos.length} markers on 2GIS map...`);
        
        // Очищаем старые маркеры
        this.clearMarkers();

        // Добавляем новые маркеры с оптимизацией производительности
        this.addMarkersWithDelay(npos, 0);
    },

    // Добавление маркеров с задержкой для производительности
    addMarkersWithDelay(npos, index) {
        if (index >= npos.length) {
            console.log(`✅ All ${npos.length} markers added to map`);
            return;
        }

        // Добавляем пачками по 10 маркеров
        const batchSize = 10;
        const endIndex = Math.min(index + batchSize, npos.length);

        for (let i = index; i < endIndex; i++) {
            this.addMarker(npos[i]);
        }

        // Следующая пачка через 50мс
        if (endIndex < npos.length) {
            setTimeout(() => {
                this.addMarkersWithDelay(npos, endIndex);
            }, 50);
        }
    },

    setView(lat, lng, zoom = 13) {
        if (this.map && this.isInitialized) {
            this.map.setView([parseFloat(lat), parseFloat(lng)], zoom);
        }
    },

    // Открыть попап для конкретной НКО
    openPopup(npoId) {
        const marker = this.markers.find(m => m.npoId == npoId);
        if (marker && marker.openPopup) {
            marker.openPopup();
            
            // Центрируем карту на маркере
            const latlng = marker.getLatLng();
            if (latlng) {
                this.map.setView(latlng, 15);
            }
        }
    },

    // Удалить все маркеры и очистить карту
    destroy() {
        this.clearMarkers();
        if (this.map && this.map.remove) {
            this.map.remove();
        }
        this.isInitialized = false;
    }
};

// UI Controller
const uiController = {
    // Initialize UI components
    async init() {
    try {
        console.log('🔧 Initializing application...');
        
        // Сначала инициализируем карту
        await this.initializeMap();
        console.log('✅ Map initialized');

        // Затем UI
        uiController.init();
        console.log('✅ UI initialized');

        // Проверка аутентификации
        await this.checkAuth();
        console.log('✅ Auth check completed');

        // Загрузка НКО
        await this.loadNPOs();
        console.log('✅ NPOs loaded');

        console.log('🚀 NKO Map application initialized successfully');
    } catch (error) {
        console.error('❌ Application initialization error:', error);
    }
},

// Отдельная функция для инициализации карты
initializeMap() {
    return new Promise((resolve) => {
        if (typeof ymaps !== 'undefined') {
            mapService.init();
            resolve();
        } else {
            // Ждем загрузки Яндекс.Карт
            const checkMap = setInterval(() => {
                if (typeof ymaps !== 'undefined') {
                    clearInterval(checkMap);
                    mapService.init();
                    resolve();
                }
            }, 100);
        }
    });
},

    delayedInit() {
        console.log('🕒 Delayed UI initialization...');
        this.setupEventListeners();
        this.populateCities();
        this.populateCategories();
    },

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        const maxRetries = 10;
        let retries = 0;
        
        const trySetup = () => {
            // Find all necessary elements
            const loginBtn = document.getElementById('loginBtn');
            const addNkoBtn = document.getElementById('addNkoBtn');
            const helpBtn = document.getElementById('helpBtn');
            const authModal = document.getElementById('authModal');
            const addNkoModal = document.getElementById('addNkoModal');
            const closeCard = document.getElementById('closeCard');
            const cancelAddNko = document.getElementById('cancelAddNko');
            const authForm = document.getElementById('authForm');
            const addNkoForm = document.getElementById('addNkoForm');
            const tabs = document.querySelectorAll('.tab');
            const toggleSidebar = document.querySelector('.toggle-sidebar');
            const searchInput = document.getElementById('searchInput');
            const citySelect = document.getElementById('citySelect');
            const closeProfileModal = document.getElementById('closeProfileModal');
            const closeAdminModal = document.getElementById('closeAdminModal');
            const adminTabs = document.querySelectorAll('.admin-tab');

            // Check if all essential elements exist
            const essentialElements = [loginBtn, addNkoBtn, helpBtn, authModal, addNkoModal];
            const allFound = essentialElements.every(element => element !== null);

            if (allFound) {
                console.log('✅ All essential elements found, setting up listeners...');
                
                // Auth modal
                loginBtn.addEventListener('click', () => {
                    console.log('🎯 Login button clicked');
                    authModal.classList.add('active');
                });

                addNkoBtn.addEventListener('click', () => {
                    console.log('🎯 Add NKO button clicked');
                    if (!state.currentUser) {
                        alert('Пожалуйста, войдите в систему для добавления организации');
                        authModal.classList.add('active');
                        return;
                    }
                    addNkoModal.classList.add('active');
                });

                // Help button
                helpBtn.addEventListener('click', () => {
                    console.log('🎯 Help button clicked');
                    alert(`Добро пожаловать на Карту добрых дел!\n\n
• Используйте фильтры для поиска организаций по городу и категории
• Нажмите на метку на карте или организацию в списке для подробной информации
• Для добавления своей организации войдите в систему\n\n
Города присутствия Росатома: ${CONFIG.CITIES.length} городов`);
                });

                // Modal close events
                authModal.addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) {
                        e.currentTarget.classList.remove('active');
                    }
                });

                addNkoModal.addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) {
                        e.currentTarget.classList.remove('active');
                    }
                });

                cancelAddNko.addEventListener('click', () => {
                    addNkoModal.classList.remove('active');
                });

                closeCard.addEventListener('click', () => {
                    document.getElementById('nkoCard').classList.remove('active');
                });

                // Profile modal close
                closeProfileModal.addEventListener('click', () => {
                    document.getElementById('profileModal').classList.remove('active');
                });

                // Admin modal close
                closeAdminModal.addEventListener('click', () => {
                    document.getElementById('adminModal').classList.remove('active');
                });

                // Tab switching
                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        
                        const nameFields = document.getElementById('nameFields');
                        const modalTitle = document.getElementById('modalTitle');
                        const submitAuth = document.getElementById('submitAuth');
                        
                        if (tab.dataset.tab === 'register') {
                            nameFields.style.display = 'block';
                            modalTitle.textContent = 'Регистрация';
                            submitAuth.textContent = 'Зарегистрироваться';
                        } else {
                            nameFields.style.display = 'none';
                            modalTitle.textContent = 'Вход в аккаунт';
                            submitAuth.textContent = 'Войти';
                        }
                    });
                });

                // Admin tabs
                adminTabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        const tabName = tab.dataset.tab;
                        
                        // Update tabs
                        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        
                        // Update content
                        document.querySelectorAll('.admin-tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        document.getElementById(`${tabName}Tab`).classList.add('active');
                        
                        // Load data for tab if needed
                        if (tabName === 'users') {
                            this.loadUsersTab();
                        }
                    });
                });

                // Form submissions
                authForm.addEventListener('submit', app.handleAuth);
                addNkoForm.addEventListener('submit', app.handleAddNPO);

                // Filters
                if (searchInput) {
                    searchInput.addEventListener('input', app.applyFilters);
                }
                
                if (citySelect) {
                    citySelect.addEventListener('change', app.applyFilters);
                }

                // Category checkboxes (assign later when they are created)
                setTimeout(() => {
                    document.querySelectorAll('input[name="category"]').forEach(checkbox => {
                        checkbox.addEventListener('change', app.applyFilters);
                    });
                }, 500);

                // Mobile sidebar toggle
                if (toggleSidebar) {
                    toggleSidebar.addEventListener('click', () => {
                        document.querySelector('.sidebar').classList.toggle('active');
                    });
                }

                // Close modals on outside click
                document.getElementById('profileModal').addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) {
                        e.currentTarget.classList.remove('active');
                    }
                });

                document.getElementById('adminModal').addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) {
                        e.currentTarget.classList.remove('active');
                    }
                });

                console.log('✅ Event listeners setup completed');
                
            } else if (retries < maxRetries) {
                retries++;
                console.log(`🕒 Some elements not found, retry ${retries}/${maxRetries}...`);
                setTimeout(trySetup, 300);
            } else {
                console.error('❌ Failed to setup event listeners after retries');
            }
        };
        
        trySetup();
    },

    populateCities() {
        const maxRetries = 10;
        let retries = 0;
        
        const tryPopulate = () => {
            const citySelect = document.getElementById('citySelect');
            const nkoCitySelect = document.getElementById('nkoCity');
            
            if (citySelect && nkoCitySelect) {
                console.log('✅ Found city select elements, populating...');
                
                CONFIG.CITIES.forEach(city => {
                    const option = `<option value="${city}">${city}</option>`;
                    citySelect.innerHTML += option;
                    nkoCitySelect.innerHTML += option;
                });
                
                console.log('✅ Cities populated successfully');
            } else if (retries < maxRetries) {
                retries++;
                console.log(`🕒 City elements not found, retry ${retries}/${maxRetries}...`);
                setTimeout(tryPopulate, 200);
            } else {
                console.error('❌ Failed to find city elements after retries');
            }
        };
        
        tryPopulate();
    },

    populateCategories() {
        const maxRetries = 10;
        let retries = 0;
        
        const tryPopulate = () => {
            const categoryFilter = document.getElementById('categoryFilter');
            const nkoCategorySelect = document.getElementById('nkoCategory');
            
            if (categoryFilter && nkoCategorySelect) {
                console.log('✅ Found category elements, populating...');
                
                CONFIG.CATEGORIES.forEach(category => {
                    // Filter checkboxes
                    categoryFilter.innerHTML += `
                        <label class="checkbox-item">
                            <input type="checkbox" name="category" value="${category}" checked>
                            <span>${category}</span>
                        </label>
                    `;

                    // Form select option
                    nkoCategorySelect.innerHTML += `<option value="${category}">${category}</option>`;
                });
                
                console.log('✅ Categories populated successfully');
            } else if (retries < maxRetries) {
                retries++;
                console.log(`🕒 Category elements not found, retry ${retries}/${maxRetries}...`);
                setTimeout(tryPopulate, 200);
            } else {
                console.error('❌ Failed to find category elements after retries');
            }
        };
        
        tryPopulate();
    },

    // Update auth UI with profile and admin access
    // Update auth UI with profile and admin access
updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const addNkoBtn = document.getElementById('addNkoBtn');

  if (state.currentUser) {
    // Show username and add menu
    if (state.currentUser.role === CONFIG.ROLES.ADMIN) {
      loginBtn.innerHTML = `<i class="fas fa-crown"></i> ${state.currentUser.firstName} ▾`;
    } else {
      loginBtn.innerHTML = `<i class="fas fa-user"></i> ${state.currentUser.firstName} ▾`;
    }
    
    // Правильный обработчик для меню пользователя
    loginBtn.onclick = (e) => {
      e.stopPropagation();
      this.showUserMenu();
    };
    
    addNkoBtn.disabled = false;
  } else {
    loginBtn.innerHTML = '<i class="fas fa-user"></i> Войти';
    loginBtn.onclick = () => document.getElementById('authModal').classList.add('active');
    addNkoBtn.disabled = true;
  }
},

// Show user menu with options
// Show user menu with options
showUserMenu() {
  console.log('🎯 showUserMenu called');
  console.log('👤 Current user:', state.currentUser);
  console.log('🎭 User role:', state.currentUser?.role);
  // Создаем выпадающее меню
  const menu = document.createElement('div');
  menu.className = 'user-menu';
  menu.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    padding: 10px 0;
    min-width: 200px;
    z-index: 10000;
    border: 1px solid #eee;
  `;

  // Для администратора
  if (state.currentUser.role === 'admin') {
    menu.innerHTML = `
      <div class="menu-item" style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px;" onclick="uiController.showProfile()">
        <i class="fas fa-user"></i> Личный кабинет
      </div>
      <div class="menu-item" style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px;" onclick="uiController.showAdminPanel()">
        <i class="fas fa-crown"></i> Админ панель
      </div>
      <hr style="margin: 5px 0; border: none; border-top: 1px solid #eee;">
      <div class="menu-item" style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #dc3545;" onclick="app.logout()">
        <i class="fas fa-sign-out-alt"></i> Выйти
      </div>
    `;
  } else {
    // Для обычного пользователя
    menu.innerHTML = `
      <div class="menu-item" style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px;" onclick="uiController.showProfile()">
        <i class="fas fa-user"></i> Личный кабинет
      </div>
      <hr style="margin: 5px 0; border: none; border-top: 1px solid #eee;">
      <div class="menu-item" style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #dc3545;" onclick="app.logout()">
        <i class="fas fa-sign-out-alt"></i> Выйти
      </div>
    `;
  }

  // Удаляем старое меню если есть
  const oldMenu = document.querySelector('.user-menu');
  if (oldMenu) oldMenu.remove();

  document.body.appendChild(menu);

  // Закрытие меню при клике вне его
  const closeMenu = (e) => {
    if (!menu.contains(e.target) && e.target.id !== 'loginBtn') {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
},

    // Show user menu
    showUserMenu() {
        if (state.currentUser.role === CONFIG.ROLES.ADMIN) {
            if (confirm('Открыть личный кабинет или админ панель?')) {
                this.showAdminPanel();
            } else {
                this.showProfile();
            }
        } else {
            this.showProfile();
        }
    },

    // Show profile modal
    async showProfile() {
        try {
            const [profileResponse, statsResponse, nposResponse] = await Promise.all([
                apiService.getProfile(),
                apiService.getProfileStats(),
                apiService.getUserNPOs()
            ]);
            
            if (profileResponse.success && statsResponse.success && nposResponse.success) {
                this.renderProfile(profileResponse.user, statsResponse.data, nposResponse.data);
                document.getElementById('profileModal').classList.add('active');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Ошибка загрузки профиля');
        }
    },

    // Render profile data
    renderProfile(user, stats, npos) {
        document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profileEmail').textContent = user.email;
        
        const roleElement = document.getElementById('profileRole');
        roleElement.textContent = user.role === 'admin' ? 'Администратор' : 'Пользователь';
        roleElement.className = `user-role role-${user.role}`;
        
        document.getElementById('statTotal').textContent = stats.totalNPOs;
        document.getElementById('statApproved').textContent = stats.approvedNPOs;
        document.getElementById('statPending').textContent = stats.pendingNPOs;
        
        this.renderUserNPOs(npos.data || npos);
    },

    // Render user's NPOs
    renderUserNPOs(npos) {
        const container = document.getElementById('userNposList');
        
        if (!npos || npos.length === 0) {
            container.innerHTML = '<div class="no-data">У вас пока нет организаций</div>';
            return;
        }

        container.innerHTML = npos.map(npo => `
            <div class="user-npo-item">
                <div class="user-npo-header">
                    <div class="user-npo-name">${npo.name}</div>
                    <span class="status-badge status-${npo.status}">
                        ${this.getStatusText(npo.status)}
                    </span>
                </div>
                <div class="user-npo-description">${npo.description}</div>
                <div class="user-npo-date">
                    Создано: ${new Date(npo.createdAt).toLocaleDateString('ru-RU')}
                    ${npo.moderatedAt ? ` • Модерация: ${new Date(npo.moderatedAt).toLocaleDateString('ru-RU')}` : ''}
                </div>
                ${npo.rejectionReason ? `
                    <div class="rejection-reason">
                        <strong>Причина отклонения:</strong> ${npo.rejectionReason}
                    </div>
                ` : ''}
            </div>
        `).join('');
    },

    // Show admin panel
async showAdminPanel() {
  try {
    console.log('👑 Opening admin panel...');
    
    // Закрываем меню
    const menu = document.querySelector('.user-menu');
    if (menu) menu.remove();
    
    // Показываем модальное окно
    document.getElementById('adminModal').classList.add('active');
    
    // Загружаем данные для модерации
    await this.loadModerationData();
    
    console.log('✅ Admin panel opened successfully');
    
  } catch (error) {
    console.error('❌ Error opening admin panel:', error);
    alert('Ошибка загрузки админ панели: ' + error.message);
  }
},

    // Load moderation data
    async loadModerationData() {
        try {
            const [moderationResponse, statsResponse] = await Promise.all([
                apiService.getModerationNPOs('pending'),
                apiService.getAdminStats()
            ]);

            if (moderationResponse.success) {
                this.renderModerationList(moderationResponse.data);
                document.getElementById('pendingCount').textContent = `${moderationResponse.total} на проверке`;
            }

            if (statsResponse.success) {
                this.renderAdminStats(statsResponse.data);
            }
        } catch (error) {
            console.error('Error loading moderation data:', error);
        }
    },

    // Render moderation list
    renderModerationList(npos) {
        const container = document.getElementById('moderationList');
        
        if (!npos || npos.length === 0) {
            container.innerHTML = '<div class="no-data">Нет организаций на модерации</div>';
            return;
        }

        container.innerHTML = npos.map(npo => `
            <div class="moderation-item" data-npo-id="${npo.id}">
                <div class="moderation-item-header">
                    <div class="moderation-item-info">
                        <h4>${npo.name}</h4>
                        <div class="moderation-item-meta">
                            <strong>Категория:</strong> ${npo.category} • 
                            <strong>Город:</strong> ${npo.city}<br>
                            <strong>Автор:</strong> ${npo.creator?.firstName || ''} ${npo.creator?.lastName || ''} ${npo.creator?.email ? `(${npo.creator.email})` : ''}<br>
                            <strong>Создано:</strong> ${new Date(npo.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                    </div>
                </div>
                <div class="moderation-item-content">
                    <p><strong>Описание:</strong> ${npo.description}</p>
                    <p><strong>Волонтерская деятельность:</strong> ${npo.volunteerActivities}</p>
                    ${npo.phone ? `<p><strong>Телефон:</strong> ${npo.phone}</p>` : ''}
                    ${npo.website ? `<p><strong>Сайт:</strong> ${npo.website}</p>` : ''}
                    <p><strong>Адрес:</strong> ${npo.address}</p>
                </div>
                <div class="moderation-actions">
                    <button class="btn btn-success btn-sm" onclick="uiController.approveNPO(${npo.id})">
                        <i class="fas fa-check"></i> Одобрить
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="uiController.showRejectForm(${npo.id})">
                        <i class="fas fa-times"></i> Отклонить
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Render admin statistics
    renderAdminStats(stats) {
        if (!stats) return;
        
        document.getElementById('adminTotalNPOs').textContent = stats.npos?.total || 0;
        document.getElementById('adminApprovedNPOs').textContent = stats.npos?.approved || 0;
        document.getElementById('adminPendingNPOs').textContent = stats.npos?.pending || 0;
        document.getElementById('adminTotalUsers').textContent = stats.users?.total || 0;
    },

    // Approve NPO
    async approveNPO(npoId) {
        if (!confirm('Одобрить эту организацию?')) return;

        try {
            const response = await apiService.approveNPO(npoId);

            if (response.success) {
                alert('Организация одобрена!');
                await this.loadModerationData();
            }
        } catch (error) {
            console.error('Error approving NPO:', error);
            alert('Ошибка при одобрении организации');
        }
    },

    // Show reject form
    showRejectForm(npoId) {
        const reason = prompt('Укажите причину отклонения:');
        if (reason && reason.trim()) {
            this.rejectNPO(npoId, reason.trim());
        }
    },

    // Reject NPO
    async rejectNPO(npoId, reason) {
        try {
            const response = await apiService.rejectNPO(npoId, reason);

            if (response.success) {
                alert('Организация отклонена!');
                await this.loadModerationData();
            }
        } catch (error) {
            console.error('Error rejecting NPO:', error);
            alert('Ошибка при отклонении организации');
        }
    },

    // Load users tab
    async loadUsersTab() {
        try {
            const response = await apiService.getUsers();
            if (response.success) {
                this.renderUsersList(response.data);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            document.getElementById('usersList').innerHTML = '<div class="error">Ошибка загрузки пользователей</div>';
        }
    },

    // Render users list
    renderUsersList(users) {
        const container = document.getElementById('usersList');
        
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="no-data">Нет пользователей</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <h4>${user.firstName} ${user.lastName}</h4>
                    <div class="user-meta">
                        ${user.email} • 
                        <span class="user-role role-${user.role}">
                            ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </span> • 
                        Зарегистрирован: ${new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                </div>
                <div class="user-actions">
                    <span class="status-badge ${user.isVerified ? 'status-approved' : 'status-pending'}">
                        ${user.isVerified ? 'Подтвержден' : 'Не подтвержден'}
                    </span>
                </div>
            </div>
        `).join('');
    },

    // Get status text
    getStatusText(status) {
        const statusMap = {
            'pending': 'На модерации',
            'approved': 'Одобрено',
            'rejected': 'Отклонено'
        };
        return statusMap[status] || status;
    },

    // Render NPO list in sidebar
    renderNPOList(npos) {
        const nkoList = document.getElementById('nkoList');
        
        if (!npos || npos.length === 0) {
            nkoList.innerHTML = '<div class="loading">Организации не найдены</div>';
            return;
        }

        nkoList.innerHTML = npos.map(npo => `
            <div class="nko-item" data-npo-id="${npo.id}">
                <div class="nko-name">${npo.name}</div>
                <div class="nko-category">${npo.category} • ${npo.city}</div>
                <div class="nko-description">${npo.description}</div>
            </div>
        `).join('');

        // Add click listeners
        nkoList.querySelectorAll('.nko-item').forEach(item => {
            item.addEventListener('click', () => {
                const npoId = item.dataset.npoId;
                const npo = npos.find(n => n.id == npoId);
                if (npo) {
                    app.showNpoCard(npoId);
                    mapService.setView(npo.lat, npo.lng);
                }
            });
        });
    },

    showNpoCard(npoId) {
    const npo = state.npos.find(n => n.id == npoId);
    if (npo) {
        state.selectedNPO = npo;
        uiController.showNPOCard(npo);
        
        // Центрируем карту на выбранной НКО и открываем попап
        mapService.setView(npo.lat, npo.lng, 15);
        setTimeout(() => {
            mapService.openPopup(npoId);
        }, 300);
    }
},
};

// Main Application
const app = {
    async init() {
        try {
            console.log('🔧 Initializing application...');
            
            // Initialize services
            mapService.init();
            uiController.init();
            
            console.log('✅ UI initialized');

            // Check authentication
            await this.checkAuth();
            console.log('✅ Auth check completed');

            // Load NPOs
            await this.loadNPOs();
            console.log('✅ NPOs loaded');

            console.log('🚀 NKO Map application initialized successfully');
        } catch (error) {
            console.error('❌ Application initialization error:', error);
        }
    },

    async checkAuth() {
        if (state.authToken) {
            try {
                const result = await apiService.getCurrentUser();
                state.currentUser = result.user;
                uiController.updateAuthUI();
            } catch (error) {
                console.error('Auth check failed:', error);
                this.logout();
            }
        }
    },

    async loadNPOs(filters = {}) {
        try {
            const result = await apiService.getNPOs(filters);
            state.npos = result.data;
            
            uiController.renderNPOList(state.npos);
            mapService.updateMarkers(state.npos);
        } catch (error) {
            console.error('Error loading NPOs:', error);
            document.getElementById('nkoList').innerHTML = 
                '<div class="loading error">Ошибка загрузки организаций</div>';
        }
    },

    async handleAuth(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const isRegister = document.querySelector('.tab[data-tab="register"]').classList.contains('active');
        
        try {
            let result;
            
            if (isRegister) {
                const firstName = document.getElementById('firstName').value;
                const lastName = document.getElementById('lastName').value;
                
                result = await apiService.register({ email, password, firstName, lastName });
            } else {
                result = await apiService.login({ email, password });
            }
            
            if (result.success) {
                state.authToken = result.token;
                state.currentUser = result.user;
                
                // Save token to localStorage
                localStorage.setItem('authToken', state.authToken);
                
                uiController.updateAuthUI();
                
                // Show success message with role info
                const roleMessage = state.currentUser.role === 'admin' ? 
                    ' (Администратор)' : '';
                alert(`${result.message}${roleMessage}`);
                
                document.getElementById('authModal').classList.remove('active');
                document.getElementById('authForm').reset();
            }
        } catch (error) {
            alert(error.message || 'Произошла ошибка при аутентификации');
        }
    },

    async handleAddNPO(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const npoData = {
            name: document.getElementById('nkoName').value,
            category: document.getElementById('nkoCategory').value,
            description: document.getElementById('nkoDescription').value,
            volunteerActivities: document.getElementById('nkoVolunteer').value,
            city: document.getElementById('nkoCity').value,
            address: document.getElementById('nkoAddress').value,
            phone: document.getElementById('nkoPhone').value,
            website: document.getElementById('nkoWebsite').value,
            lat: 55.75, // In real app, get from map picker
            lng: 37.62  // In real app, get from map picker
        };
        
        try {
            const result = await apiService.createNPO(npoData);
            
            if (result.success) {
                alert(result.message);
                document.getElementById('addNkoModal').classList.remove('active');
                document.getElementById('addNkoForm').reset();
                
                // Reload user's NPOs if profile is open
                if (document.getElementById('profileModal').classList.contains('active')) {
                    uiController.showProfile();
                }
            }
        } catch (error) {
            alert(error.message || 'Произошла ошибка при добавлении организации');
        }
    },

    applyFilters() {
        const filters = {
            city: document.getElementById('citySelect').value,
            category: Array.from(document.querySelectorAll('input[name="category"]:checked'))
                .map(checkbox => checkbox.value),
            search: document.getElementById('searchInput').value
        };

        this.loadNPOs(filters);
    },

    showNpoCard(npoId) {
        const npo = state.npos.find(n => n.id == npoId);
        if (npo) {
            state.selectedNPO = npo;
            uiController.showNPOCard(npo);
        }
    },

    logout() {
  state.currentUser = null;
  state.authToken = null;
  localStorage.removeItem('authToken');
  uiController.updateAuthUI();
  
  // Закрываем все модальные окна
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
  
  // Удаляем меню если открыто
  const menu = document.querySelector('.user-menu');
  if (menu) menu.remove();
  
  alert('Вы вышли из системы');
}
};

// Debug: Check that script is loaded
console.log('🚀 script.js loaded successfully');

// Debug: Check function availability
console.log('🔧 Functions available:', {
    uiController: typeof uiController,
    app: typeof app,
    mapService: typeof mapService,
    apiService: typeof apiService
});

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM fully loaded');
    app.init();
});

// Make app globally available for HTML onclick handlers
window.app = app;
window.uiController = uiController;