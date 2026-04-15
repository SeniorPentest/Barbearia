// Supabase configuration
const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';

const hasSupabaseConfig = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('SUA_SUPABASE_URL') &&
    !supabaseAnonKey.includes('SUA_SUPABASE_ANON_KEY')
);
const supabaseClient = (typeof supabase !== 'undefined' && hasSupabaseConfig)
    ? supabase.createClient(supabaseUrl, supabaseAnonKey)
    : null;

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (value = 0) => currencyFormatter.format(Number(value) || 0);
const parsePrice = (text = '') => {
    const normalized = text.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

// Carrossel com autoplay (Snacks e Planos)
function initCarousel(containerSelector) {
    const carouselWrapper = document.querySelector(containerSelector);
    if (!carouselWrapper) return;

    const carousel = carouselWrapper.querySelector('.carousel-track') || carouselWrapper.querySelector('.snacks-carousel');
    if (!carousel) return;

    const cards = carousel.querySelectorAll('.snack-card, .plan-card, .carousel-item');
    const totalSlides = cards.length;
    if (!totalSlides) return;

    const prevBtn = carouselWrapper.querySelector('.carousel-btn-prev');
    const nextBtn = carouselWrapper.querySelector('.carousel-btn-next');
    const dotsContainer = carouselWrapper.querySelector('.carousel-dots');

    let currentSlide = 0;
    let autoplayId = null;

    carousel.classList.add('is-carousel');

    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => { currentSlide = i; updateCarousel(); resetAutoplay(); });
            dotsContainer.appendChild(dot);
        }
    }

    const getGap = () => parseFloat(getComputedStyle(carousel).columnGap || getComputedStyle(carousel).gap || '0') || 0;

    const getMetrics = () => {
        const cardWidth = cards[0].offsetWidth + getGap();
        const visibleCards = Math.max(1, Math.round(carouselWrapper.offsetWidth / cardWidth));
        const maxIndex = Math.max(0, totalSlides - visibleCards);
        return { cardWidth, maxIndex };
    };

    function updateCarousel() {
        const { cardWidth, maxIndex } = getMetrics();
        if (currentSlide > maxIndex) currentSlide = maxIndex;
        carousel.style.transform = 'translateX(-' + (currentSlide * cardWidth) + 'px)';
        if (dotsContainer) {
            dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        }
    }

    function nextSlide() {
        const { maxIndex } = getMetrics();
        currentSlide = (currentSlide >= maxIndex) ? 0 : currentSlide + 1;
        updateCarousel();
    }
    function prevSlide() {
        const { maxIndex } = getMetrics();
        currentSlide = (currentSlide > 0) ? currentSlide - 1 : maxIndex;
        updateCarousel();
    }

    const startAutoplay = () => { stopAutoplay(); autoplayId = setInterval(nextSlide, 3000); };
    const stopAutoplay = () => { if (autoplayId) { clearInterval(autoplayId); autoplayId = null; } };
    const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };

    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoplay(); });
    window.addEventListener('resize', updateCarousel);
    carouselWrapper.addEventListener('mouseenter', stopAutoplay);
    carouselWrapper.addEventListener('mouseleave', startAutoplay);

    updateCarousel();
    startAutoplay();
}

// Carrossel de ARRASTAR sem autoplay (Values - mobile only)
function initDragCarousel(containerSelector) {
    const wrapper = document.querySelector(containerSelector);
    if (!wrapper) return;

    const carousel = wrapper.querySelector('.values-grid') || wrapper.querySelector('.carousel-track');
    if (!carousel) return;

    const cards = carousel.querySelectorAll('.value-card');
    const totalSlides = cards.length;
    if (!totalSlides) return;

    const dotsContainer = wrapper.querySelector('.carousel-dots');
    let currentSlide = 0;

    const isMobile = () => window.innerWidth <= 700;

    carousel.classList.add('is-carousel');

    const buildDots = () => {
        if (!dotsContainer) return;
        if (!isMobile()) { dotsContainer.innerHTML = ''; return; }
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => { currentSlide = i; updateDrag(); });
            dotsContainer.appendChild(dot);
        }
    }

    const getCardWidth = () => {
        const gap = parseFloat(getComputedStyle(carousel).columnGap || getComputedStyle(carousel).gap || '16') || 16;
        return cards[0].offsetWidth + gap;
    };

    const updateDrag = () => {
        if (!isMobile()) { carousel.style.transform = ''; return; }
        if (currentSlide > totalSlides - 1) currentSlide = totalSlides - 1;
        if (currentSlide < 0) currentSlide = 0;
        carousel.style.transform = 'translateX(-' + (currentSlide * getCardWidth()) + 'px)';
        if (dotsContainer) {
            dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        }
    };

    let touchStartX = 0, touchDeltaX = 0;
    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchDeltaX = 0;
        carousel.style.transition = 'none';
    }, { passive: true });
    carousel.addEventListener('touchmove', (e) => {
        touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive: true });
    carousel.addEventListener('touchend', () => {
        carousel.style.transition = 'transform 0.3s ease';
        if (touchDeltaX < -50 && currentSlide < totalSlides - 1) currentSlide++;
        else if (touchDeltaX > 50 && currentSlide > 0) currentSlide--;
        updateDrag();
    });

    let mouseDown = false, mouseStartX = 0, mouseDeltaX = 0;
    carousel.addEventListener('mousedown', (e) => {
        if (!isMobile()) return;
        mouseDown = true; mouseStartX = e.clientX; mouseDeltaX = 0;
        carousel.style.transition = 'none';
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (!mouseDown) return;
        mouseDeltaX = e.clientX - mouseStartX;
    });
    window.addEventListener('mouseup', () => {
        if (!mouseDown) return;
        mouseDown = false;
        carousel.style.transition = 'transform 0.3s ease';
        if (mouseDeltaX < -50 && currentSlide < totalSlides - 1) currentSlide++;
        else if (mouseDeltaX > 50 && currentSlide > 0) currentSlide--;
        updateDrag();
    });

    window.addEventListener('resize', () => { currentSlide = 0; buildDots(); updateDrag(); });

    buildDots();
    updateDrag();
}

// Carrinho de compras com integração Mercado Pago
function setupCart() {
    const cartItemsEl = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const cartEmptyEl = document.getElementById('cart-empty');
    const cartPanel = document.getElementById('cart-panel');
    if (!cartItemsEl || !cartTotalEl || !cartEmptyEl || !cartPanel) return;

    const scheduleInput = document.getElementById('appointment-datetime');
    const getScheduleValue = () => (scheduleInput?.value || '').trim();
    const formatSchedule = (value) => {
        if (!value) return '';
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        }
        return value.replace('T', ' ');
    };
    const openCartPanel = () => {
        cartPanel?.classList.add('cart-open');
        cartPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const cartState = new Map();

    // 1. Cria e injeta o botão de Finalizar Compra
    let checkoutBtn = document.getElementById('checkout-btn');
    if (!checkoutBtn) {
        checkoutBtn = document.createElement('button');
        checkoutBtn.id = 'checkout-btn';
        checkoutBtn.className = 'btn btn-primary btn-full';
        checkoutBtn.style.marginTop = '16px';
        checkoutBtn.textContent = 'Finalizar Compra com Segurança';
        cartPanel.appendChild(checkoutBtn);

        // 2. Lógica de clique do botão
        checkoutBtn.addEventListener('click', async () => {
            if (cartState.size === 0) return alert('Carrinho vazio!');
            const scheduleValue = getScheduleValue();
            if (!scheduleValue) {
                alert('Escolha uma data e horário para o agendamento antes de finalizar a compra.');
                return;
            }

            // Pega o email do usuário se estiver logado
            const { data: { session } } = await supabaseClient.auth.getSession();
            const email = session?.user?.email || 'cliente@visitante.com';

            checkoutBtn.textContent = 'Gerando pagamento seguro...';
            checkoutBtn.disabled = true;

            // Formata os itens para o Mercado Pago
            const items = Array.from(cartState.values()).map(item => {
                const itemSchedule = item.schedule || scheduleValue;
                const scheduleLabel = formatSchedule(itemSchedule);
                return {
                    title: item.name,
                    quantity: item.qty,
                    unit_price: item.price,
                    ...(scheduleLabel ? { description: `Agendamento: ${scheduleLabel}` } : {})
                };
            });

            try {
                // Chama a Edge Function do Supabase
                const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                    body: { items, email, appointment: scheduleValue }
                });

                if (error) throw error;
                if (data?.init_point) {
                    // Redireciona o cliente para a tela do Mercado Pago
                    window.location.href = data.init_point; 
                } else {
                    throw new Error('Link não gerado.');
                }
            } catch (err) {
                console.error('Erro no pagamento:', err);
                alert('Erro ao conectar com o Mercado Pago. Tente novamente.');
                checkoutBtn.textContent = 'Finalizar Compra com Segurança';
                checkoutBtn.disabled = false;
            }
        });
    }

    const renderCart = () => {
        cartItemsEl.innerHTML = '';
        let total = 0;
        cartState.forEach((item) => {
            total += item.price * item.qty;
            const li = document.createElement('li');
            li.className = 'cart-item';

            const info = document.createElement('div');
            const scheduleLabel = formatSchedule(item.schedule);
            info.innerHTML = `<div class="cart-item-name">${item.name}</div><div class="cart-item-meta">${item.qty}x ${formatCurrency(item.price)}</div>${scheduleLabel ? `<div class="cart-item-meta">Agendamento: ${scheduleLabel}</div>` : ''}`;

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.alignItems = 'center';
            actions.style.gap = '8px';

            const value = document.createElement('strong');
            value.textContent = formatCurrency(item.price * item.qty);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'cart-remove';
            removeBtn.textContent = 'Remover';
            removeBtn.addEventListener('click', () => {
                cartState.delete(item.name);
                renderCart();
            });

            actions.append(value, removeBtn);
            li.append(info, actions);
            cartItemsEl.appendChild(li);
        });

        const isEmpty = cartState.size === 0;
        cartEmptyEl.style.display = isEmpty ? 'block' : 'none';
        checkoutBtn.style.display = isEmpty ? 'none' : 'block';
        cartTotalEl.textContent = formatCurrency(total);
    };

    const addToCart = (item) => {
        const selectedSchedule = getScheduleValue();
        const current = cartState.get(item.name);
        if (current) {
            current.qty += 1;
            current.schedule = selectedSchedule || current.schedule || '';
        } else {
            cartState.set(item.name, { ...item, qty: 1, schedule: selectedSchedule });
        }
        renderCart();
        openCartPanel();
    };

    const fallbackProducts = [
        { name: 'Produto Base 1', price: 19.9 },
        { name: 'Produto Base 2', price: 24.9 },
        { name: 'Produto Base 3', price: 29.9 },
        { name: 'Produto Base 4', price: 34.9 }
    ];

    document.querySelectorAll('.snacks-carousel .snack-card').forEach((card, index) => {
        const defaultProduct = fallbackProducts[index % fallbackProducts.length];
        const name = (card.querySelector('h3')?.textContent || defaultProduct.name).trim();
        const priceText = card.querySelector('.price-value')?.textContent || '';
        const parsedPrice = parsePrice(priceText);
        const price = parsedPrice || defaultProduct.price;

        card.dataset.name = name;
        card.dataset.price = price;

        const priceEl = card.querySelector('.price-value');
        if (priceEl) priceEl.textContent = formatCurrency(price);

        let btn = card.querySelector('.add-to-cart-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline-dark add-to-cart-btn';
            btn.textContent = 'Adicionar ao carrinho';
            card.appendChild(btn);
        }
        // Evita múltiplos cliques duplicados recriando o botão
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => addToCart({ name, price }));
    });

    renderCart();
}

// Supabase auth + pontos
async function ensureClienteRow(user, nome, email) {
    if (!supabaseClient || !user?.id) return;
    await supabaseClient.from('clientes').upsert({
        id: user.id,
        nome: nome || email || user.email || 'Cliente',
        email: email || user.email || ''
    });
}

async function fetchClienteData(userId) {
    if (!supabaseClient || !userId) return null;
    const { data, error } = await supabaseClient
        .from('clientes')
        .select('nome, email, pontos')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar pontos do cliente', error);
        return null;
    }
    return data;
}

function updateLoyaltyCard(loyaltyNameEl, loyaltyPointsEl, cliente) {
    if (loyaltyNameEl) loyaltyNameEl.textContent = cliente?.nome || 'Visitante';
    if (loyaltyPointsEl) loyaltyPointsEl.textContent = (cliente?.pontos ?? 0).toLocaleString('pt-BR');
}

function setAuthStatus(statusEl, message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('success', 'error');
    if (message) statusEl.classList.add(isError ? 'error' : 'success');
}

function setupAuth() {
    const loyaltyNameEl = document.getElementById('loyalty-name');
    const loyaltyPointsEl = document.getElementById('loyalty-points');
    updateLoyaltyCard(loyaltyNameEl, loyaltyPointsEl, { nome: 'Visitante', pontos: 0 });

    const statusEl = document.getElementById('auth-status');
    const nameInput = document.getElementById('auth-name');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const loginButton = document.getElementById('login-button');
    const signupButton = document.getElementById('signup-button');

    if (!statusEl || !emailInput || !passwordInput) return;

    if (!supabaseClient) {
        setAuthStatus(statusEl, 'Informe sua URL e anon key do Supabase em script.js.', true);
        return;
    }

    const loadClienteAndCard = async (user) => {
        if (!user) {
            updateLoyaltyCard(loyaltyNameEl, loyaltyPointsEl, { nome: 'Visitante', pontos: 0 });
            return;
        }
        const cliente = await fetchClienteData(user.id);
        if (cliente) {
            updateLoyaltyCard(loyaltyNameEl, loyaltyPointsEl, cliente);
        } else {
            updateLoyaltyCard(loyaltyNameEl, loyaltyPointsEl, { nome: user.email || 'Cliente', pontos: 0 });
        }
    };

    loginButton?.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) {
            setAuthStatus(statusEl, 'Preencha e-mail e senha.', true);
            return;
        }
        setAuthStatus(statusEl, 'Entrando...');
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await ensureClienteRow(data.user, nameInput.value.trim(), email);
            await loadClienteAndCard(data.user);
            setAuthStatus(statusEl, 'Login realizado!');
        } catch (err) {
            console.error('Erro no login', err);
            setAuthStatus(statusEl, err.message || 'Não foi possível entrar.', true);
        }
    });

    signupButton?.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const nome = nameInput.value.trim();
        if (!email || !password) {
            setAuthStatus(statusEl, 'Informe e-mail e senha para cadastrar.', true);
            return;
        }
        setAuthStatus(statusEl, 'Criando conta...');
        try {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            const user = data.user || data.session?.user;
            if (user) {
                await ensureClienteRow(user, nome || email, email);
                await loadClienteAndCard(user);
                setAuthStatus(statusEl, 'Cadastro criado!');
            } else {
                setAuthStatus(statusEl, 'Cadastro iniciado! Confirme o e-mail para continuar.');
            }
        } catch (err) {
            console.error('Erro no cadastro', err);
            setAuthStatus(statusEl, err.message || 'Não foi possível criar a conta.', true);
        }
    });

    supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session?.user) loadClienteAndCard(data.session.user);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        loadClienteAndCard(session?.user);
    });
}

// Inicialização Global
document.addEventListener('DOMContentLoaded', () => {
    initCarousel('.snacks-carousel-wrapper');
    initCarousel('.plans-wrapper');
    initDragCarousel('.values-wrapper');

    document.querySelectorAll('.snack-card-img img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => {
            if (img.dataset.fallback) { img.src = img.dataset.fallback; img.removeAttribute('data-fallback'); }
        }, { once: true });
    });

    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 20);
        });
    }

    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            navLinks.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
        });
    }

    const form = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    if (form && formStatus) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            formStatus.textContent = 'Mensagem enviada com sucesso!';
            formStatus.className = 'form-status success';
            form.reset();
            setTimeout(() => { formStatus.textContent = ''; formStatus.className = 'form-status'; }, 4000);
        });
    }

    setupCart();
    setupAuth();
});
