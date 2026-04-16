const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const state = {
    service: null,
    price: 0,
    datetime: '',
    professional: '',
    paymentMethod: null
};

const unavailableSlots = [
    '2026-04-20T14:00',
    '2026-04-20T16:00',
    '2026-04-21T10:00'
];

const els = {
    summaryService: document.getElementById('summary-service'),
    summarySchedule: document.getElementById('summary-schedule'),
    summaryProfessional: document.getElementById('summary-professional'),
    totalValue: document.getElementById('total-value'),
    feedback: document.getElementById('booking-feedback'),
    summaryText: document.getElementById('summary-text'),
    statusText: document.getElementById('status-text'),
    statusDot: document.getElementById('status-dot'),
    confirmBtn: document.getElementById('confirm-btn'),
    floatingConfirm: document.getElementById('floating-confirm'),
    availabilityFeedback: document.getElementById('availability-feedback')
};

function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return 'Escolha data e hora';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Escolha data e hora';
    return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTimeLabel(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isWithinBusinessHours(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
    const hour = date.getHours();
    const minutes = date.getMinutes();
    if (hour < 9) return false;
    if (hour > 20) return false;
    if (hour === 20 && minutes > 0) return false;
    return true;
}

function isUnavailableSlot(value) {
    if (!value) return false;
    const normalized = value.slice(0, 16);
    return unavailableSlots.includes(normalized);
}

function clearAvailabilityFeedback() {
    if (!els.availabilityFeedback) return;
    els.availabilityFeedback.innerHTML = '';
}

function applyAlternativeSlot(value) {
    const appointment = document.getElementById('appointment');
    if (!appointment) return;
    appointment.value = value;
    state.datetime = value;
    clearAvailabilityFeedback();
    updateSummary();
}

function showAvailabilityFeedback(message, alternatives = []) {
    if (!els.availabilityFeedback) return;
    els.availabilityFeedback.innerHTML = '';
    if (!message) return;

    const text = document.createElement('span');
    text.textContent = message;
    els.availabilityFeedback.appendChild(text);

    alternatives.slice(0, 3).forEach(slotValue => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'alt-slot';
        btn.textContent = formatTimeLabel(slotValue) || slotValue;
        btn.addEventListener('click', () => applyAlternativeSlot(slotValue));
        els.availabilityFeedback.appendChild(btn);
    });
}

function generateAlternativeSlots(baseDate) {
    if (!(baseDate instanceof Date) || Number.isNaN(baseDate.getTime())) return [];

    const steps = [1, 2, 3, -1, -2, -3, 4, -4, 5, -5];
    const suggestions = [];

    steps.forEach(step => {
        if (suggestions.length >= 3) return;
        const candidate = new Date(baseDate);
        candidate.setHours(candidate.getHours() + step, 0, 0, 0);

        const sameDay = candidate.getFullYear() === baseDate.getFullYear()
            && candidate.getMonth() === baseDate.getMonth()
            && candidate.getDate() === baseDate.getDate();
        const value = formatInputValue(candidate);

        if (sameDay && isWithinBusinessHours(candidate) && !isUnavailableSlot(value)) {
            suggestions.push(value);
        }
    });

    return suggestions;
}

function setStatus(message, type = 'pending') {
    if (els.statusText) els.statusText.textContent = message;
    if (!els.statusDot) return;
    const colors = {
        pending: '#e53935',
        waiting: '#f1c232',
        success: '#34c759'
    };
    const bg = colors[type] || colors.pending;
    els.statusDot.style.background = bg;
    els.statusDot.style.boxShadow = `0 0 0 4px ${bg}33`;
}

function updateSummary() {
    const serviceLabel = state.service ? `${state.service}` : 'Nenhum selecionado';
    const priceLabel = state.service ? formatCurrency(state.price) : 'R$ 0,00';
    if (els.summaryService) els.summaryService.textContent = `${serviceLabel} • ${priceLabel}`;
    if (els.summarySchedule) els.summarySchedule.textContent = formatDate(state.datetime);
    if (els.summaryProfessional) els.summaryProfessional.textContent = state.professional || 'Primeiro disponível';
    if (els.totalValue) els.totalValue.textContent = state.service ? formatCurrency(state.price) : 'R$ 0,00';

    const detail = state.service
        ? `${state.service} em ${formatDate(state.datetime)}`
        : 'Selecione um serviço para seguir aos próximos passos.';
    if (els.summaryText) els.summaryText.textContent = detail;

    const ready = isReadyToConfirm();
    if (els.confirmBtn) els.confirmBtn.disabled = !ready;
    if (els.floatingConfirm) els.floatingConfirm.disabled = !ready;
}

function isReadyToConfirm() {
    if (!state.service || !state.datetime || !state.paymentMethod) return false;
    if (state.paymentMethod === 'card') {
        const name = document.getElementById('card-name')?.value.trim();
        const number = document.getElementById('card-number')?.value.replace(/\s+/g, '');
        const expiry = document.getElementById('card-expiry')?.value.trim();
        const cvv = document.getElementById('card-cvv')?.value.trim();
        return Boolean(name && number && number.length >= 15 && expiry && cvv && cvv.length >= 3);
    }
    return true;
}

function clearActiveCards() {
    document.querySelectorAll('.service-card').forEach(card => card.classList.remove('selected'));
}

function selectPayment(method) {
    state.paymentMethod = method;
    document.querySelectorAll('.payment-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.toggle('active', form.dataset.method === method);
    });
    const label = method === 'pix' ? 'Pagamento aguardando chave Pix'
        : method === 'card' ? 'Validação do cartão para garantir o horário'
        : 'Pagamento presencial';
    setStatus(label, method === 'card' ? 'waiting' : 'pending');
    updateSummary();
}

function handleServiceSelection(card) {
    const name = card.dataset.service;
    const price = Number(card.dataset.price) || 0;
    clearActiveCards();
    card.classList.add('selected');
    state.service = name;
    state.price = price;
    updateSummary();
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function attachServiceHandlers() {
    document.querySelectorAll('.service-card').forEach(card => {
        const button = card.querySelector('.service-select');
        button?.addEventListener('click', () => handleServiceSelection(card));
    });
}

function attachPaymentHandlers() {
    document.querySelectorAll('.payment-button').forEach(btn => {
        btn.addEventListener('click', () => selectPayment(btn.dataset.method));
    });
}

function handleAppointmentChange(value) {
    if (!value) {
        state.datetime = '';
        clearAvailabilityFeedback();
        updateSummary();
        return;
    }

    const parsed = new Date(value);
    const withinHours = isWithinBusinessHours(parsed);
    const unavailable = isUnavailableSlot(value);

    if (!withinHours || unavailable) {
        const reason = unavailable
            ? 'Horário indisponível.'
            : 'Fora do horário comercial (9h às 20h).';
        const alternatives = generateAlternativeSlots(parsed);
        showAvailabilityFeedback(reason, alternatives);
        state.datetime = '';
        updateSummary();
        return;
    }

    clearAvailabilityFeedback();
    state.datetime = value.slice(0, 16);
    updateSummary();
}

function attachFormHandlers() {
    const appointment = document.getElementById('appointment');
    const professional = document.getElementById('professional');

    appointment?.addEventListener('change', (e) => {
        handleAppointmentChange(e.target.value);
    });
    professional?.addEventListener('change', (e) => {
        state.professional = e.target.value;
        updateSummary();
    });

    ['card-number', 'card-expiry'].forEach(id => {
        const input = document.getElementById(id);
        input?.addEventListener('input', () => {
            if (id === 'card-number') {
                input.value = input.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            } else {
                input.value = input.value.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, (_, m1, m2) => m2 ? `${m1}/${m2}` : m1);
            }
            updateSummary();
        });
    });

    ['card-name', 'card-cvv'].forEach(id => {
        const input = document.getElementById(id);
        input?.addEventListener('input', updateSummary);
    });
}

async function copyPixKey() {
    const pixKey = document.getElementById('pix-key')?.textContent?.trim();
    if (!pixKey) return;
    try {
        await navigator.clipboard.writeText(pixKey);
        if (els.feedback) els.feedback.textContent = 'Chave Pix copiada. Finalize para registrar o pagamento.';
    } catch {
        if (els.feedback) els.feedback.textContent = 'Não foi possível copiar automaticamente. Use a chave exibida.';
    }
}

function confirmBooking() {
    if (!isReadyToConfirm()) return;
    const dateLabel = formatDate(state.datetime);
    const professional = state.professional || 'primeiro disponível';
    const paymentLabel = state.paymentMethod === 'pix' ? 'Pix'
        : state.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro na barbearia';
    const message = `Agendamento confirmado: ${state.service} para ${dateLabel} com ${professional}. Forma de pagamento: ${paymentLabel}.`;

    if (els.feedback) {
        els.feedback.textContent = message + ' Você receberá confirmação em instantes.';
        els.feedback.style.color = '#c6a15b';
    }
    if (els.summaryText) els.summaryText.textContent = message;
    setStatus('Agendamento confirmado', 'success');
}

function attachConfirmHandlers() {
    const confirm = () => confirmBooking();
    els.confirmBtn?.addEventListener('click', confirm);
    els.floatingConfirm?.addEventListener('click', confirm);
}

function setupHeroCarousel() {
    const viewport = document.querySelector('.carousel-viewport');
    const slides = Array.from(document.querySelectorAll('.hero-slide'));
    const arrows = document.querySelectorAll('.carousel-arrow');
    if (!viewport || !slides.length) return;

    let currentIndex = 0;

    const setActive = (index) => {
        slides.forEach((slide, idx) => slide.classList.toggle('is-active', idx === index));
    };

    const goTo = (index) => {
        currentIndex = (index + slides.length) % slides.length;
        const target = slides[currentIndex];
        if (target) {
            viewport.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
        }
        setActive(currentIndex);
    };

    arrows.forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.dataset.direction === 'prev' ? -1 : 1;
            goTo(currentIndex + dir);
        });
    });

    let debounce;
    viewport.addEventListener('scroll', () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
            const { scrollLeft } = viewport;
            let nearest = currentIndex;
            slides.forEach((slide, idx) => {
                const distance = Math.abs(slide.offsetLeft - scrollLeft);
                const best = Math.abs(slides[nearest].offsetLeft - scrollLeft);
                if (distance < best - 1) nearest = idx;
            });
            if (nearest !== currentIndex) {
                currentIndex = nearest;
                setActive(currentIndex);
            }
        }, 80);
    });

    goTo(0);
}

document.addEventListener('DOMContentLoaded', () => {
    attachServiceHandlers();
    attachPaymentHandlers();
    attachFormHandlers();
    attachConfirmHandlers();
    setupHeroCarousel();

    document.getElementById('copy-pix')?.addEventListener('click', copyPixKey);

    selectPayment('pix');
    updateSummary();
});
