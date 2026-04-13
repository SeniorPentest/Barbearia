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
    };

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
});
