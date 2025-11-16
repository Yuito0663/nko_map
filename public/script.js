// Configuration for Render
const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:10000/api' 
        : '/api',
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
            ...options
        };

        if (state.authToken) {
            config.headers.Authorization = `Bearer ${state.authToken}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error ${response.status}:`, errorText);
                
                // Попробуем распарсить JSON ошибки
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.message || `HTTP ${response.status}`);
                } catch {
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
            }

            const data = await response.json();
            console.log(`API Success: ${options.method || 'GET'} ${url}`);
            return data;
            
        } catch (error) {
            console.error('API request failed:', error);
            
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
            if (value) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v));
                } else {
                    params.append(key, value);
                }
            }
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

// Map service for Leaflet
const mapService = {
    map: null,
    markers: [],
    isInitialized: false,

    init() {
        try {
            console.log('Initializing Leaflet Map...');
            
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                console.error('Map container not found');
                return;
            }

            // Очищаем контейнер карты
            mapContainer.innerHTML = '';

            // Инициализация карты Leaflet
            this.map = L.map('map').setView([55.75, 37.62], 5);
            
            // Добавляем тайлы OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18
            }).addTo(this.map);

            this.isInitialized = true;
            console.log('Leaflet Map initialized successfully');

        } catch (error) {
            console.error('Error initializing Leaflet Map:', error);
        }
    },

    addMarker(npo) {
        if (!this.map || !this.isInitialized) {
            console.warn('Map not ready, skipping marker:', npo.name);
            return null;
        }

        try {
            // Создаем кастомную иконку
            const icon = this.createCustomIcon(npo.category);
            
            // Проверяем координаты
            const lat = parseFloat(npo.lat);
            const lng = parseFloat(npo.lng);
            
            if (isNaN(lat) || isNaN(lng)) {
                console.warn('Invalid coordinates for NPO:', npo.name, npo.lat, npo.lng);
                return null;
            }

            // Создаем метку
            const marker = L.marker([lat, lng], { icon })
                .addTo(this.map)
                .bindPopup(`
                    <div style="min-width: 250px; padding: 10px;">
                        <h4 style="margin: 0 0 8px 0; color: #003274;">${npo.name}</h4>
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #777;">
                            <strong>Категория:</strong> ${npo.category}
                        </p>
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #777;">
                            <strong>Город:</strong> ${npo.city}
                        </p>
                        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;">
                            ${npo.description ? npo.description.substring(0, 120) + '...' : 'Описание отсутствует'}
                        </p>
                        <button onclick="app.showNpoCard(${npo.id})" 
                                style="padding: 8px 16px; background: #025EA1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                            Подробнее
                        </button>
                    </div>
                `);

            // Сохраняем ссылку на маркер
            marker.npoId = npo.id;
            this.markers.push(marker);

            // Обработчик клика по метке
            marker.on('click', () => {
                app.showNpoCard(npo.id);
            });

            return marker;

        } catch (error) {
            console.error('Error adding marker:', error);
            return null;
        }
    },

    // Создание кастомной иконки для маркера
    createCustomIcon(category) {
        const colors = {
            'Экология': '#56C02B',      // зеленый
            'Помощь животным': '#FCC30B', // желтый
            'Социальная поддержка': '#E2007A', // маджента
            'Образование': '#025EA1',   // синий
            'Культура': '#6CACE4',      // голубой
            'Спорт': '#FD6925',         // оранжевый
            'Здравоохранение': '#259789', // бирюзовый
            'Другое': '#6c757d'
        };

        const color = colors[category] || '#003274';
        
        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    background-color: ${color};
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                "></div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
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
            console.warn('Map not initialized, skipping markers update');
            return;
        }

        console.log(`Updating ${npos ? npos.length : 0} markers on map...`);
        
        // Очищаем старые маркеры
        this.clearMarkers();

        // Добавляем новые маркеры
        if (npos && Array.isArray(npos)) {
            npos.forEach(npo => this.addMarker(npo));
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
        if (marker) {
            marker.openPopup();
            
            // Центрируем карту на маркере
            this.setView(marker.getLatLng().lat, marker.getLatLng().lng, 15);
        }
    }
};

// UI Controller
const uiController = {
    // Initialize UI components
    init() {
        console.log('Initializing UI components...');
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.delayedInit();
            });
        } else {
            setTimeout(() => this.delayedInit(), 100);
        }
    },

    delayedInit() {
        console.log('Delayed UI initialization...');
        this.setupEventListeners();
        this.populateCities();
        this.populateCategories();
    },

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
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
                console.log('All essential elements found, setting up listeners...');
                
                // Auth modal
                loginBtn.addEventListener('click', () => {
                    console.log('Login button clicked');
                    authModal.classList.add('active');
                });

                addNkoBtn.addEventListener('click', () => {
                    console.log('Add NKO button clicked');
                    if (!state.currentUser) {
                        alert('Пожалуйста, войдите в систему для добавления организации');
                        authModal.classList.add('active');
                        return;
                    }
                    addNkoModal.classList.add('active');
                });

                // Help button
                helpBtn.addEventListener('click', () => {
                    console.log('Help button clicked');
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
                if (closeProfileModal) {
                    closeProfileModal.addEventListener('click', () => {
                        document.getElementById('profileModal').classList.remove('active');
                    });
                }

                // Admin modal close
                if (closeAdminModal) {
                    closeAdminModal.addEventListener('click', () => {
                        document.getElementById('adminModal').classList.remove('active');
                    });
                }

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
                if (adminTabs.length > 0) {
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
                            const tabContent = document.getElementById(`${tabName}Tab`);
                            if (tabContent) {
                                tabContent.classList.add('active');
                            }
                            
                            // Load data for tab if needed
                            if (tabName === 'users') {
                                this.loadUsersTab();
                            }
                        });
                    });
                }

                // Form submissions
                if (authForm) {
                    authForm.addEventListener('submit', app.handleAuth);
                }
                if (addNkoForm) {
                    addNkoForm.addEventListener('submit', app.handleAddNPO);
                }

                // Filters
                if (searchInput) {
                    searchInput.addEventListener('input', app.applyFilters);
                }
                
                if (citySelect) {
                    citySelect.addEventListener('change', app.applyFilters);
                }

                // Category checkboxes (assign later when they are created)
                setTimeout(() => {
                    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
                    if (categoryCheckboxes.length > 0) {
                        categoryCheckboxes.forEach(checkbox => {
                            checkbox.addEventListener('change', app.applyFilters);
                        });
                    }
                }, 500);

                // Mobile sidebar toggle
                if (toggleSidebar) {
                    toggleSidebar.addEventListener('click', () => {
                        document.querySelector('.sidebar').classList.toggle('active');
                    });
                }

                // Close modals on outside click
                const profileModal = document.getElementById('profileModal');
                if (profileModal) {
                    profileModal.addEventListener('click', (e) => {
                        if (e.target === e.currentTarget) {
                            e.currentTarget.classList.remove('active');
                        }
                    });
                }

                const adminModal = document.getElementById('adminModal');
                if (adminModal) {
                    adminModal.addEventListener('click', (e) => {
                        if (e.target === e.currentTarget) {
                            e.currentTarget.classList.remove('active');
                        }
                    });
                }

                console.log('Event listeners setup completed');
                
            } else if (retries < maxRetries) {
                retries++;
                console.log(`Some elements not found, retry ${retries}/${maxRetries}...`);
                setTimeout(trySetup, 300);
            } else {
                console.error('Failed to setup event listeners after retries');
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
                console.log('Found city select elements, populating...');
                
                // Очищаем существующие опции (кроме первой)
                citySelect.innerHTML = '<option value="">Все города</option>';
                nkoCitySelect.innerHTML = '<option value="">Выберите город</option>';
                
                CONFIG.CITIES.forEach(city => {
                    const option = `<option value="${city}">${city}</option>`;
                    citySelect.innerHTML += option;
                    nkoCitySelect.innerHTML += option;
                });
                
                console.log('Cities populated successfully');
            } else if (retries < maxRetries) {
                retries++;
                console.log(`City elements not found, retry ${retries}/${maxRetries}...`);
                setTimeout(tryPopulate, 200);
            } else {
                console.error('Failed to find city elements after retries');
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
                console.log('Found category elements, populating...');
                
                // Очищаем существующие опции
                categoryFilter.innerHTML = '';
                nkoCategorySelect.innerHTML = '<option value="">Выберите категорию</option>';
                
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
                
                console.log('Categories populated successfully');
            } else if (retries < maxRetries) {
                retries++;
                console.log(`Category elements not found, retry ${retries}/${maxRetries}...`);
                setTimeout(tryPopulate, 200);
            } else {
                console.error('Failed to find category elements after retries');
            }
        };
        
        tryPopulate();
    },

// Update auth UI with profile and admin access
updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const addNkoBtn = document.getElementById('addNkoBtn');

    if (!loginBtn) return;

    // Удаляем все существующие обработчики
    const newLoginBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

    if (state.currentUser) {
        // Show username
        if (state.currentUser.role === CONFIG.ROLES.ADMIN) {
            newLoginBtn.innerHTML = `<i class="fas fa-crown"></i> ${state.currentUser.firstName} ▾`;
        } else {
            newLoginBtn.innerHTML = `<i class="fas fa-user"></i> ${state.currentUser.firstName} ▾`;
        }
        
        // Добавляем обработчик для меню
        newLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showUserMenu(e);
        });
        
        if (addNkoBtn) {
            addNkoBtn.disabled = false;
        }
    } else {
        newLoginBtn.innerHTML = '<i class="fas fa-user"></i> Войти';
        
        // Добавляем обработчик для авторизации
        newLoginBtn.addEventListener('click', () => {
            const authModal = document.getElementById('authModal');
            if (authModal) authModal.classList.add('active');
        });
        
        if (addNkoBtn) {
            addNkoBtn.disabled = true;
        }
    }
},

// Show user menu with options - ОБНОВЛЕННАЯ ВЕРСИЯ
showUserMenu(e) {
    console.log('🎯 showUserMenu called');
    
    // Удаляем старое меню если есть
    const oldMenu = document.querySelector('.user-menu');
    if (oldMenu) oldMenu.remove();

    // Получаем позицию кнопки
    const loginBtn = document.getElementById('loginBtn');
    const btnRect = loginBtn.getBoundingClientRect();

    // Создаем выпадающее меню
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.style.cssText = `
        position: absolute;
        top: ${btnRect.bottom + window.scrollY}px;
        right: ${window.innerWidth - btnRect.right}px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        padding: 8px 0;
        min-width: 220px;
        z-index: 10000;
        border: 1px solid #eee;
        font-family: 'Rosatom', sans-serif;
    `;

    // Для администратора
    if (state.currentUser.role === 'admin') {
        menu.innerHTML = `
            <div class="menu-item profile-item" style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background-color 0.2s; border: none; background: none; width: 100%; text-align: left; font-size: 14px;">
                <i class="fas fa-user" style="color: #025EA1; width: 16px;"></i>
                <span>Личный кабинет</span>
            </div>
            <div class="menu-item admin-item" style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background-color 0.2s; border: none; background: none; width: 100%; text-align: left; font-size: 14px;">
                <i class="fas fa-crown" style="color: #FCC30B; width: 16px;"></i>
                <span>Админ панель</span>
            </div>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #eee;">
            <div class="menu-item logout-item" style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background-color 0.2s; border: none; background: none; width: 100%; text-align: left; font-size: 14px; color: #dc3545;">
                <i class="fas fa-sign-out-alt" style="width: 16px;"></i>
                <span>Выйти</span>
            </div>
        `;
    } else {
        // Для обычного пользователя
        menu.innerHTML = `
            <div class="menu-item profile-item" style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background-color 0.2s; border: none; background: none; width: 100%; text-align: left; font-size: 14px;">
                <i class="fas fa-user" style="color: #025EA1; width: 16px;"></i>
                <span>Личный кабинет</span>
            </div>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #eee;">
            <div class="menu-item logout-item" style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background-color 0.2s; border: none; background: none; width: 100%; text-align: left; font-size: 14px; color: #dc3545;">
                <i class="fas fa-sign-out-alt" style="width: 16px;"></i>
                <span>Выйти</span>
            </div>
        `;
    }

    document.body.appendChild(menu);

    // Добавляем обработчики событий
    const addMenuItemHandler = (selector, handler) => {
        const element = menu.querySelector(selector);
        if (element) {
            element.addEventListener('click', handler);
            element.addEventListener('mouseenter', () => {
                element.style.backgroundColor = selector.includes('logout') ? '#fff5f5' : '#f8f9fa';
            });
            element.addEventListener('mouseleave', () => {
                element.style.backgroundColor = '';
            });
        }
    };

    // Обработчики для пунктов меню
    addMenuItemHandler('.profile-item', () => {
        console.log('👤 Opening profile...');
        menu.remove();
        this.showProfile();
    });

    addMenuItemHandler('.admin-item', () => {
        console.log('👑 Opening admin panel...');
        menu.remove();
        this.showAdminPanel();
    });

    addMenuItemHandler('.logout-item', () => {
        console.log('🚪 Logging out...');
        menu.remove();
        app.logout();
    });

    // Закрытие меню при клике вне его
    const closeMenuHandler = (e) => {
        if (!menu.contains(e.target) && e.target !== loginBtn && !loginBtn.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenuHandler);
            document.removeEventListener('keydown', handleEscape);
        }
    };

    // Закрытие меню по Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            menu.remove();
            document.removeEventListener('click', closeMenuHandler);
            document.removeEventListener('keydown', handleEscape);
        }
    };

    // Даем время для добавления меню в DOM
    setTimeout(() => {
        document.addEventListener('click', closeMenuHandler);
        document.addEventListener('keydown', handleEscape);
    }, 10);
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
                const profileModal = document.getElementById('profileModal');
                if (profileModal) {
                    profileModal.classList.add('active');
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Ошибка загрузки профиля: ' + error.message);
        }
    },

    // Render profile data
    renderProfile(user, stats, npos) {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileRole = document.getElementById('profileRole');
        const statTotal = document.getElementById('statTotal');
        const statApproved = document.getElementById('statApproved');
        const statPending = document.getElementById('statPending');

        if (profileName) profileName.textContent = `${user.firstName} ${user.lastName}`;
        if (profileEmail) profileEmail.textContent = user.email;
        
        if (profileRole) {
            profileRole.textContent = user.role === 'admin' ? 'Администратор' : 'Пользователь';
            profileRole.className = `user-role role-${user.role}`;
        }
        
        if (statTotal) statTotal.textContent = stats.totalNPOs || 0;
        if (statApproved) statApproved.textContent = stats.approvedNPOs || 0;
        if (statPending) statPending.textContent = stats.pendingNPOs || 0;
        
        this.renderUserNPOs(npos.data || npos);
    },

    // Render user's NPOs
    renderUserNPOs(npos) {
        const container = document.getElementById('userNposList');
        if (!container) return;
        
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
            console.log('Opening admin panel...');
            
            // Закрываем меню
            const menu = document.querySelector('.user-menu');
            if (menu) menu.remove();
            
            // Показываем модальное окно
            const adminModal = document.getElementById('adminModal');
            if (adminModal) {
                adminModal.classList.add('active');
            }
            
            // Загружаем данные для модерации
            await this.loadModerationData();
            
            console.log('Admin panel opened successfully');
            
        } catch (error) {
            console.error('Error opening admin panel:', error);
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
                const pendingCount = document.getElementById('pendingCount');
                if (pendingCount) {
                    pendingCount.textContent = `${moderationResponse.total} на проверке`;
                }
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
        if (!container) return;
        
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
        
        const adminTotalNPOs = document.getElementById('adminTotalNPOs');
        const adminApprovedNPOs = document.getElementById('adminApprovedNPOs');
        const adminPendingNPOs = document.getElementById('adminPendingNPOs');
        const adminTotalUsers = document.getElementById('adminTotalUsers');
        
        if (adminTotalNPOs) adminTotalNPOs.textContent = stats.npos?.total || 0;
        if (adminApprovedNPOs) adminApprovedNPOs.textContent = stats.npos?.approved || 0;
        if (adminPendingNPOs) adminPendingNPOs.textContent = stats.npos?.pending || 0;
        if (adminTotalUsers) adminTotalUsers.textContent = stats.users?.total || 0;
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
            alert('Ошибка при одобрении организации: ' + error.message);
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
            alert('Ошибка при отклонении организации: ' + error.message);
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
            const usersList = document.getElementById('usersList');
            if (usersList) {
                usersList.innerHTML = '<div class="error">Ошибка загрузки пользователей</div>';
            }
        }
    },

    // Render users list
    renderUsersList(users) {
        const container = document.getElementById('usersList');
        if (!container) return;
        
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
        if (!nkoList) return;
        
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

    // Show NPO card with details
    showNPOCard(npo) {
        const card = document.getElementById('nkoCard');
        if (!card) return;

        const cardTitle = document.getElementById('cardTitle');
        const cardCategory = document.getElementById('cardCategory');
        const cardDescription = document.getElementById('cardDescription');
        const cardVolunteer = document.getElementById('cardVolunteer');
        const cardAddress = document.getElementById('cardAddress');
        const cardPhone = document.getElementById('cardPhone');
        const cardWebsite = document.getElementById('cardWebsite');

        if (cardTitle) cardTitle.textContent = npo.name;
        if (cardCategory) cardCategory.textContent = npo.category;
        if (cardDescription) cardDescription.textContent = npo.description;
        if (cardVolunteer) cardVolunteer.textContent = npo.volunteerActivities;
        if (cardAddress) cardAddress.textContent = npo.address;
        if (cardPhone) cardPhone.textContent = npo.phone || 'Не указан';
        if (cardWebsite) cardWebsite.textContent = npo.website || 'Не указан';

        // Social links
        const socialContainer = document.getElementById('cardSocial');
        if (socialContainer) {
            socialContainer.innerHTML = '';
            
            if (npo.social_vk) {
                socialContainer.innerHTML += `<a href="${npo.social_vk}" class="social-link" target="_blank"><i class="fab fa-vk"></i></a>`;
            }
            if (npo.social_telegram) {
                socialContainer.innerHTML += `<a href="${npo.social_telegram}" class="social-link" target="_blank"><i class="fab fa-telegram"></i></a>`;
            }
            if (npo.social_instagram) {
                socialContainer.innerHTML += `<a href="${npo.social_instagram}" class="social-link" target="_blank"><i class="fab fa-instagram"></i></a>`;
            }
        }

        card.classList.add('active');
    }
};

// Main Application
const app = {
    async init() {
        try {
            console.log('Initializing application...');
            
            // Initialize services
            mapService.init();
            uiController.init();
            
            console.log('UI initialized');

            // Check authentication
            await this.checkAuth();
            console.log('Auth check completed');

            // Load NPOs
            await this.loadNPOs();
            console.log('NPOs loaded');

            console.log('NKO Map application initialized successfully');
        } catch (error) {
            console.error('Application initialization error:', error);
        }
    },

    async checkAuth() {
        if (state.authToken) {
            try {
                const result = await apiService.getCurrentUser();
                if (result.success) {
                    state.currentUser = result.user;
                    uiController.updateAuthUI();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.logout();
            }
        }
    },

    async loadNPOs(filters = {}) {
        try {
            const result = await apiService.getNPOs(filters);
            if (result.success) {
                state.npos = result.data;
                uiController.renderNPOList(state.npos);
                mapService.updateMarkers(state.npos);
            } else {
                throw new Error(result.message || 'Failed to load NPOs');
            }
        } catch (error) {
            console.error('Error loading NPOs:', error);
            const nkoList = document.getElementById('nkoList');
            if (nkoList) {
                nkoList.innerHTML = '<div class="loading error">Ошибка загрузки организаций: ' + error.message + '</div>';
            }
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
                
                if (!firstName || !lastName) {
                    alert('Пожалуйста, заполните все поля');
                    return;
                }
                
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
                
                const authModal = document.getElementById('authModal');
                if (authModal) {
                    authModal.classList.remove('active');
                }
                const authForm = document.getElementById('authForm');
                if (authForm) {
                    authForm.reset();
                }
            } else {
                throw new Error(result.message || 'Authentication failed');
            }
        } catch (error) {
            alert(error.message || 'Произошла ошибка при аутентификации');
        }
    },

    async handleAddNPO(e) {
        e.preventDefault();
        
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
        
        // Валидация обязательных полей
        if (!npoData.name || !npoData.category || !npoData.description || !npoData.volunteerActivities || !npoData.city || !npoData.address) {
            alert('Пожалуйста, заполните все обязательные поля (отмечены *)');
            return;
        }
        
        try {
            const result = await apiService.createNPO(npoData);
            
            if (result.success) {
                alert(result.message);
                const addNkoModal = document.getElementById('addNkoModal');
                if (addNkoModal) {
                    addNkoModal.classList.remove('active');
                }
                const addNkoForm = document.getElementById('addNkoForm');
                if (addNkoForm) {
                    addNkoForm.reset();
                }
                
                // Reload user's NPOs if profile is open
                if (document.getElementById('profileModal')?.classList.contains('active')) {
                    uiController.showProfile();
                }
                
                // Reload all NPOs
                await this.loadNPOs();
            } else {
                throw new Error(result.message || 'Failed to create NPO');
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
            
            // Центрируем карту на выбранной НКО и открываем попап
            mapService.setView(npo.lat, npo.lng, 15);
            setTimeout(() => {
                mapService.openPopup(npoId);
            }, 300);
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
console.log('script.js loaded successfully');

// Debug: Check function availability
console.log('Functions available:', {
    uiController: typeof uiController,
    app: typeof app,
    mapService: typeof mapService,
    apiService: typeof apiService
});

// Initialize application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM fully loaded');
        app.init();
    });
} else {
    console.log('DOM already loaded');
    app.init();
}

// Make app globally available for HTML onclick handlers
window.app = app;
window.uiController = uiController;
window.mapService = mapService;