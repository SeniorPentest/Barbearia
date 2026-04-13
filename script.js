 codex/refactor-init-carousel-function
// Função principal do Carrossel
function initCarousel(containerSelector) {
    const carouselWrapper = document.querySelector(containerSelector);
    if (!carouselWrapper) return;

    const carousel = carouselWrapper.querySelector('.carousel-track') || carouselWrapper.querySelector('.snacks-carousel');
    if (!carousel) return;

    const cards = carousel.querySelectorAll('.snack-card, .plan-card, .value-card, .carousel-item');
    const totalSlides = cards.length;
    if (!totalSlides) return;

    const prevBtn = carouselWrapper.querySelector('.carousel-btn-prev');
    const nextBtn = carouselWrapper.querySelector('.carousel-btn-next');
    const dotsContainer = carouselWrapper.querySelector('.carousel-dots');

    let currentSlide = 0; // Variável local para evitar conflitos
    let autoplayId = null;

    carousel.classList.add('is-carousel');

    // 1. Criar pontos de navegação
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

    const getGap = () => {
        const style = getComputedStyle(carousel);
        const gapValue = style.columnGap || style.gap || '0';
        return parseFloat(gapValue) || 0;
    };

    const getCarouselMetrics = () => {
        const cardWidth = cards[0].offsetWidth + getGap(); // Largura + Gap
        const visibleCards = Math.max(1, Math.round(carouselWrapper.offsetWidth / cardWidth));

function initCarousel(wrapperSelector, trackSelector, cardSelector) {
    const wrapper = document.querySelector(wrapperSelector);
    const track = document.querySelector(trackSelector);
    if (!wrapper || !track) return;

    const cards = track.querySelectorAll(cardSelector);
    const totalSlides = cards.length;
    let currentSlide = 0;
    let autoplayId = null;

    const getMetrics = () => {
        const cardWidth = cards[0].offsetWidth + 24; 
        const visibleCards = Math.round(wrapper.offsetWidth / cardWidth);
 main
        const maxIndex = Math.max(0, totalSlides - visibleCards);
        return { cardWidth, maxIndex };
    };

    function updateCarousel() {
        const { cardWidth, maxIndex } = getMetrics();
        if (currentSlide > maxIndex) currentSlide = maxIndex;
        track.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
    }

    function nextSlide() {
        const { maxIndex } = getMetrics();
        currentSlide = (currentSlide >= maxIndex) ? 0 : currentSlide + 1;
        updateCarousel();
    }

 codex/refactor-init-carousel-function
    function prevSlide() {
        const { maxIndex } = getCarouselMetrics();
        currentSlide = (currentSlide > 0) ? currentSlide - 1 : maxIndex;
        updateCarousel();
    }

    // 4. Autoplay (Girar Sozinho)
    const startAutoplay = () => {
        stopAutoplay();
        autoplayId = setInterval(nextSlide, 3000);
    };

    const stopAutoplay = () => {
        if (autoplayId) { clearInterval(autoplayId); autoplayId = null; }
    };

    const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };

    const startAutoplay = () => { autoplayId = setInterval(nextSlide, 3500); };
    const stopAutoplay = () => { if (autoplayId) clearInterval(autoplayId); };
 main

    wrapper.addEventListener('mouseenter', stopAutoplay);
    wrapper.addEventListener('mouseleave', startAutoplay);
    window.addEventListener('resize', updateCarousel);

    updateCarousel();
    startAutoplay();
}

document.addEventListener('DOMContentLoaded', () => {
 codex/refactor-init-carousel-function
    initCarousel('.snacks-carousel-wrapper');
    initCarousel('.plans-wrapper');
    initCarousel('.values-wrapper');
    // Fallback de imagens (mantido do original)
    document.querySelectorAll('.snack-card-img img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => {
            if (img.dataset.fallback) { img.src = img.dataset.fallback; img.removeAttribute('data-fallback'); }
        }, { once: true });
    });

    initCarousel('.snacks-carousel-wrapper', '.snacks-carousel', '.snack-card');
    initCarousel('.plans-carousel-wrapper', '.plans-grid', '.plan-card');
    initCarousel('.values-wrapper', '.values-grid', '.value-card');
 main
});
