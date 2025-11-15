// Debug: Проверка что скрипт загружен
console.log('🚀 script.js loaded successfully');

// Debug: Проверка доступности функций
console.log('🔧 Functions available:', {
    uiController: typeof uiController,
    app: typeof app,
    mapService: typeof mapService
});
// Configuration
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
    ]
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
        };

        if (state.authToken) {
            config.headers.Authorization = `Bearer ${state.authToken}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка сервера');
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
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

    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: { email },
        });
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
    }
};

// Map service
const mapService = {
    init() {
        // Initialize Leaflet map
        state.map = L.map('map').setView([55.75, 37.62], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(state.map);
    },

    addMarker(npo) {
        const marker = L.marker([npo.lat, npo.lng])
            .addTo(state.map)
            .bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: #006CB7;">${npo.name}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #777;">
                        <strong>Категория:</strong> ${npo.category}
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 14px;">
                        ${npo.description.substring(0, 100)}...
                    </p>
                    <button class="btn btn-primary" onclick="app.showNpoCard('${npo._id}')"
                            style="padding: 6px 12px; font-size: 12px;">
                        Подробнее
                    </button>
                </div>
            `);

        marker.npoId = npo._id;
        state.markers.push(marker);

        marker.on('click', () => {
            app.showNpoCard(npo._id);
        });

        return marker;
    },

    clearMarkers() {
        state.markers.forEach(marker => {
            state.map.removeLayer(marker);
        });
        state.markers = [];
    },

    updateMarkers(npos) {
        this.clearMarkers();
        npos.forEach(npo => this.addMarker(npo));
    },

    setView(lat, lng, zoom = 13) {
        state.map.setView([lat, lng], zoom);
    }
};

// UI Controller
const uiController = {
    // Initialize UI components
    init() {
        console.log('🔧 Initializing UI components...');
        
        // Сначала настраиваем обработчики событий
        this.setupEventListeners();
        
        // Затем заполняем данные (с задержкой)
        setTimeout(() => {
            this.populateCities();
            this.populateCategories();
        }, 100);
    },

    populateCities() {
    try {
        const citySelect = document.getElementById('citySelect');
        const nkoCitySelect = document.getElementById('nkoCity');
        
        // Проверяем что элементы существуют
        if (!citySelect || !nkoCitySelect) {
            console.warn('⚠️ City select elements not found, retrying...');
            setTimeout(() => this.populateCities(), 100);
            return;
        }

        console.log('✅ Populating cities...');
        
        CONFIG.CITIES.forEach(city => {
            const option = `<option value="${city}">${city}</option>`;
            citySelect.innerHTML += option;
            nkoCitySelect.innerHTML += option;
        });
        
        console.log('✅ Cities populated successfully');
    } catch (error) {
        console.error('❌ Error populating cities:', error);
    }
},

    populateCategories() {
    try {
        const categoryFilter = document.getElementById('categoryFilter');
        const nkoCategorySelect = document.getElementById('nkoCategory');
        
        // Проверяем что элементы существуют
        if (!categoryFilter || !nkoCategorySelect) {
            console.warn('⚠️ Category elements not found, retrying...');
            setTimeout(() => this.populateCategories(), 100);
            return;
        }

        console.log('✅ Populating categories...');
        
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
    } catch (error) {
        console.error('❌ Error populating categories:', error);
    }
},

    setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    const maxRetries = 10;
    let retries = 0;
    
    const trySetup = () => {
        // Ищем все необходимые элементы
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

        // Проверяем что все основные элементы найдены
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

            // Category checkboxes (назначаем позже, когда они будут созданы)
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

            console.log('✅ Event listeners setup completed');
            
        } else if (retries < maxRetries) {
            retries++;
            console.log(`🕒 Some elements not found, retry ${retries}/${maxRetries}...`);
            console.log('Missing elements:', {
                loginBtn: !!loginBtn,
                addNkoBtn: !!addNkoBtn,
                helpBtn: !!helpBtn,
                authModal: !!authModal,
                addNkoModal: !!addNkoModal
            });
            setTimeout(trySetup, 300);
        } else {
            console.error('❌ Failed to setup event listeners after retries');
            console.log('Final element status:', {
                loginBtn: !!loginBtn,
                addNkoBtn: !!addNkoBtn,
                helpBtn: !!helpBtn,
                authModal: !!authModal,
                addNkoModal: !!addNkoModal
            });
        }
    };
    
    trySetup();
},

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const addNkoBtn = document.getElementById('addNkoBtn');

        if (state.currentUser) {
            loginBtn.innerHTML = `<i class="fas fa-user"></i> ${state.currentUser.firstName}`;
            loginBtn.onclick = () => {
                if (confirm('Вы хотите выйти из системы?')) {
                    app.logout();
                }
            };
            addNkoBtn.disabled = false;
        } else {
            loginBtn.innerHTML = '<i class="fas fa-user"></i> Войти';
            loginBtn.onclick = () => document.getElementById('authModal').classList.add('active');
            addNkoBtn.disabled = true;
        }
    },

    renderNPOList(npos) {
        const nkoList = document.getElementById('nkoList');

        if (npos.length === 0) {
            nkoList.innerHTML = '<div class="loading">Организации не найдены</div>';
            return;
        }

        nkoList.innerHTML = npos.map(npo => `
            <div class="nko-item" data-npo-id="${npo._id}">
                <div class="nko-name">${npo.name}</div>
                <div class="nko-category">${npo.category} • ${npo.city}</div>
                <div class="nko-description">${npo.description}</div>
            </div>
        `).join('');

        // Add click listeners
        nkoList.querySelectorAll('.nko-item').forEach(item => {
            item.addEventListener('click', () => {
                const npoId = item.dataset.npoId;
                const npo = npos.find(n => n._id === npoId);
                if (npo) {
                    app.showNpoCard(npoId);
                    mapService.setView(npo.lat, npo.lng);
                }
            });
        });
    },

    showNPOCard(npo) {
        const card = document.getElementById('nkoCard');
        document.getElementById('cardTitle').textContent = npo.name;
        document.getElementById('cardCategory').textContent = npo.category;
        document.getElementById('cardDescription').textContent = npo.description;
        document.getElementById('cardVolunteer').textContent = npo.volunteerActivities;
        document.getElementById('cardAddress').textContent = npo.address;
        document.getElementById('cardPhone').textContent = npo.phone || 'Не указан';
        document.getElementById('cardWebsite').textContent = npo.website || 'Не указан';

        // Social links
        const socialContainer = document.getElementById('cardSocial');
        socialContainer.innerHTML = '';

        if (npo.social) {
            if (npo.social.vk) {
                socialContainer.innerHTML += `<a href="${npo.social.vk}" class="social-link" target="_blank"><i class="fab fa-vk"></i></a>`;
            }
            if (npo.social.telegram) {
                socialContainer.innerHTML += `<a href="${npo.social.telegram}" class="social-link" target="_blank"><i class="fab fa-telegram"></i></a>`;
            }
            if (npo.social.instagram) {
                socialContainer.innerHTML += `<a href="${npo.social.instagram}" class="social-link" target="_blank"><i class="fab fa-instagram"></i></a>`;
            }
        }

        card.classList.add('active');
    }
};

// Main Application
const app = {
    async init() {
        try {
            // Initialize services
            mapService.init();
            uiController.init();

            // Check authentication
            await this.checkAuth();

            // Load NPOs
            await this.loadNPOs();

            console.log('🚀 NKO Map application initialized');
        } catch (error) {
            console.error('Application initialization error:', error);
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

                alert(result.message);
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
            name: formData.get('nkoName'),
            category: formData.get('nkoCategory'),
            description: formData.get('nkoDescription'),
            volunteerActivities: formData.get('nkoVolunteer'),
            city: formData.get('nkoCity'),
            address: formData.get('nkoAddress'),
            phone: formData.get('nkoPhone'),
            website: formData.get('nkoWebsite'),
            lat: 55.75, // In real app, get from map picker
            lng: 37.62  // In real app, get from map picker
        };

        try {
            const result = await apiService.createNPO(npoData);

            if (result.success) {
                alert(result.message);
                document.getElementById('addNkoModal').classList.remove('active');
                document.getElementById('addNkoForm').reset();

                // Reload NPOs to show the new one (if approved)
                await this.loadNPOs();
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
        const npo = state.npos.find(n => n._id === npoId);
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
        alert('Вы вышли из системы');
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Make app globally available for HTML onclick handlers
window.app = app;
