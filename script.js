/**
 * Motor Genérico de Carrossel
 * @param {string} wrapperSelector - O contêiner pai (moldura)
 * @param {string} trackSelector   - A div que desliza (trilha)
 * @param {string} cardSelector    - A classe dos itens internos
 */
function initCarousel(wrapperSelector, trackSelector, cardSelector) {
    const wrapper = document.querySelector(wrapperSelector);
    const track = document.querySelector(trackSelector);
    if (!wrapper || !track) return;

    const cards = track.querySelectorAll(cardSelector);
    const totalSlides = cards.length;
    const prevBtn = wrapper.parentElement.querySelector('.carousel-btn-prev');
    const nextBtn = wrapper.parentElement.querySelector('.carousel-btn-next');
    const dotsContainer = wrapper.parentElement.querySelector('.carousel-dots');

    let currentSlide = 0;
    let autoplayId = null;

    // Métricas Dinâmicas (Sensores de largura)
    const getMetrics = () => {
        const cardWidth = cards[0].offsetWidth + 24; 
        const visibleCards = Math.round(wrapper.offsetWidth / cardWidth);
        const maxIndex = Math.max(0, totalSlides - visibleCards);
        return { cardWidth, maxIndex };
    };

    function updateCarousel() {
        const { cardWidth, maxIndex } = getMetrics();
        if (currentSlide > maxIndex) currentSlide = maxIndex;
        
        track.style.transform = `translateX(-${currentSlide * cardWidth}px)`;

        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.carousel-dot');
            dots.forEach((dot, index) => dot.classList.toggle('active', index === currentSlide));
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

    // Controle de Automação (Autoplay)
    const startAutoplay = () => {
        stopAutoplay();
        autoplayId = setInterval(nextSlide, 3500);
    };

    const stopAutoplay = () => {
        if (autoplayId) clearInterval(autoplayId);
        autoplayId = null;
    };

    // Listeners de Interrupção
    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); startAutoplay(); });
    
    wrapper.addEventListener('mouseenter', stopAutoplay);
    wrapper.addEventListener('mouseleave', startAutoplay);
    window.addEventListener('resize', updateCarousel);

    // Inicialização do módulo
    updateCarousel();
    startAutoplay();
}

// Inicialização das Instâncias do Sistema
document.addEventListener('DOMContentLoaded', () => {
    // Carrossel de Snacks
    initCarousel('.snacks-carousel-wrapper', '.snacks-carousel', '.snack-card');
    
    // Carrossel de Planos
    initCarousel('.plans-carousel-wrapper', '.plans-grid', '.plan-card');
    
    // Carrossel de Valores (O que nos move)
    initCarousel('.values-wrapper', '.values-grid', '.value-card');

    // Fallback de Imagens
    document.querySelectorAll('img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => {
            img.src = img.dataset.fallback;
        }, { once: true });
    });
});
