const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

let PIX_KEY = '5511915723418';
let WHATSAPP_NUMBER = '5511915723418';
let MERCHANT_NAME = 'Barbearia Premium';
let MERCHANT_CITY = 'Sao Paulo';

const state = {
    profile: null,
    services: [],
    professionals: [],
    selectedServices: [],
    selectedProfessionalId: '',
    totalPrice: 0,
    paymentMethod: 'pix',
    selectedDate: '',
    selectedSlot: null,
    availabilityStatus: 'idle',
    availabilityMessage: 'Selecione uma data para ver horários',
    availabilitySlots: []
};

function emvField(id, value) {
    const length = String(value.length).padStart(2, '0');
    return `${id}${length}${value}`;
}

function calculateCRC16(payload) {
    let crc = 0xffff;

    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {
            const flag = crc & 0x8000;
            crc = (crc << 1) & 0xffff;
            if (flag) crc ^= 0x1021;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(amount) {
    const amountFormatted = Number(amount).toFixed(2);
    const txid = `BARB${Date.now().toString().slice(-6)}`;

    const merchantAccountInfo = emvField(
        '26',
        emvField('00', 'BR.GOV.BCB.PIX') +
        emvField('01', PIX_KEY)
    );

    const additionalData = emvField('62', emvField('05', txid));

    let payload = '';
    payload += emvField('00', '01');
    payload += emvField('01', '12');
    payload += merchantAccountInfo;
    payload += emvField('52', '0000');
    payload += emvField('53', '986');
    payload += emvField('54', amountFormatted);
    payload += emvField('58', 'BR');
    payload += emvField('59', MERCHANT_NAME);
    payload += emvField('60', MERCHANT_CITY);
    payload += additionalData;
    payload += '6304';

    const crc = calculateCRC16(payload);
    return `${payload}${crc}`;
}

function normalizeDateTimeWithOffset(value) {
    if (!value || typeof value !== 'string') return value;

    if (/T\d{2}:\d{2}:\d{2}[+-]\d{2}$/.test(value)) {
        return `${value}:00`;
    }

    return value;
}

function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function isValidBrazilPhone(value) {
    const digits = onlyDigits(value);
    return digits.length >= 10 && digits.length <= 11;
}

function formatPhoneInput(value) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 2) {
        return digits;
    }

    if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';

    const [year, month, day] = dateStr.split('-');

    if (!year || !month || !day) return dateStr;

    return `${day}/${month}/${year}`;
}

function formatSlotForDisplay(slot) {
    if (!slot) return '';

    return `${formatDateForDisplay(state.selectedDate)} às ${slot.time}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function setAvailability(status, message) {
    state.availabilityStatus = status;
    state.availabilityMessage = message;
    renderAvailabilityStatus();
}

function renderAvailabilityStatus() {
    const statusEl = document.getElementById('shop-status');

    if (!statusEl) return;

    statusEl.textContent = state.availabilityMessage;
    statusEl.className = 'shop-status';

    if (state.availabilityStatus === 'open') {
        statusEl.classList.add('status-open');
    } else if (state.availabilityStatus === 'closed') {
        statusEl.classList.add('status-closed');
    } else if (state.availabilityStatus === 'error') {
        statusEl.classList.add('status-error');
    } else {
        statusEl.classList.add('status-neutral');
    }
}

function renderSlots() {
    const slotsGrid = document.getElementById('slots-grid');

    if (!slotsGrid) return;

    slotsGrid.innerHTML = '';

    if (state.availabilityStatus === 'loading') {
        slotsGrid.innerHTML = '<p class="slots-message">Carregando horários...</p>';
        return;
    }

    if (state.availabilityStatus === 'error') {
        slotsGrid.innerHTML = '<p class="slots-message">Erro ao consultar disponibilidade.</p>';
        return;
    }

    if (state.availabilityStatus === 'closed') {
        slotsGrid.innerHTML = '<p class="slots-message">Barbearia fechada para a data selecionada.</p>';
        return;
    }

    if (!state.availabilitySlots.length) {
        slotsGrid.innerHTML = '<p class="slots-message">Sem horários disponíveis para esta data.</p>';
        return;
    }

    state.availabilitySlots.forEach((slot) => {
        const btn = document.createElement('button');

        btn.type = 'button';
        btn.className = 'slot-button';
        btn.textContent = slot.time;
        btn.classList.toggle('selected', state.selectedSlot?.start === slot.start);

        btn.addEventListener('click', () => {
            state.selectedSlot = {
                ...slot,
                start: normalizeDateTimeWithOffset(slot.start),
                end: normalizeDateTimeWithOffset(slot.end)
            };

            renderSlots();
            updateUI();
        });

        slotsGrid.appendChild(btn);
    });
}

async function loadAvailabilityByDate(date) {
    if (!date) {
        state.availabilitySlots = [];
        state.selectedSlot = null;
        setAvailability('idle', 'Selecione uma data para ver horários');
        renderSlots();
        updateUI();
        return;
    }

    state.selectedSlot = null;
    state.availabilitySlots = [];
    setAvailability('loading', 'Carregando horários...');
    renderSlots();
    updateUI();

    try {
        const response = await fetch(
            `${supabaseUrl}/functions/v1/disponibilidade?date=${encodeURIComponent(date)}`
        );

        if (!response.ok) {
            throw new Error('Falha na consulta de disponibilidade');
        }

        const data = await response.json();
        const slots = Array.isArray(data?.slots) ? data.slots : [];

        state.availabilitySlots = slots.map((slot) => ({
            ...slot,
            start: normalizeDateTimeWithOffset(slot.start),
            end: normalizeDateTimeWithOffset(slot.end)
        }));

        if (data?.status === 'closed') {
            setAvailability('closed', 'Barbearia fechada');
        } else if (!state.availabilitySlots.length) {
            setAvailability('open', 'Sem horários disponíveis');
        } else {
            setAvailability('open', 'Barbearia aberta • Escolha um horário');
        }

        renderSlots();
    } catch (error) {
        console.error(error);

        state.availabilitySlots = [];
        state.selectedSlot = null;

        setAvailability('error', 'Erro ao consultar disponibilidade');
        renderSlots();
    } finally {
        updateUI();
    }
}


async function loadBarbershopProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('barbershop_profile')
            .select(`
                name,
                subtitle,
                hero_title,
                hero_description,
                logo_url,
                instagram_url,
                whatsapp_number,
                pix_key,
                address,
                city,
                payment_pix_enabled,
                payment_card_enabled,
                payment_onsite_enabled
            `)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return;
        }

        state.profile = data;

        PIX_KEY = data.pix_key || PIX_KEY;
        WHATSAPP_NUMBER = data.whatsapp_number || WHATSAPP_NUMBER;
        MERCHANT_NAME = data.name || MERCHANT_NAME;
        MERCHANT_CITY = data.city || MERCHANT_CITY;

        applyBarbershopProfile(data);
    } catch (error) {
        console.error('Erro ao carregar dados da barbearia:', error);
    }
}

function applyBarbershopProfile(profile) {
    document.title = profile.name || 'Barbearia Premium';

    document.querySelectorAll('.brand-logo-img').forEach((img) => {
        if (profile.logo_url) {
            img.src = profile.logo_url;
        }

        img.alt = profile.name || 'Logo da barbearia';
    });

    document.querySelectorAll('.brand-name').forEach((el) => {
        el.textContent = profile.name || 'Barbearia Premium';
    });

    document.querySelectorAll('.brand-kicker').forEach((el) => {
        el.textContent = profile.subtitle || 'Studio Masculino';
    });

    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle && profile.hero_title) {
        heroTitle.innerHTML = escapeHtml(profile.hero_title).replaceAll(',', ',<br>');
    }

    const heroDescription = document.querySelector('.hero-content p');
    if (heroDescription && profile.hero_description) {
        heroDescription.textContent = profile.hero_description;
    }

    const footerText = document.querySelector('.site-footer p');
    if (footerText && profile.name) {
        footerText.textContent = `© 2026 ${profile.name}. Todos os direitos reservados.`;
    }

    const addressText = document.getElementById('barbershop-address-text');
    if (addressText && profile.address) {
        addressText.textContent = profile.address;
    }

    const contactText = document.getElementById('barbershop-contact-text');
    if (contactText && profile.whatsapp_number) {
        contactText.textContent = `WhatsApp: ${formatBrazilPhone(profile.whatsapp_number)}`;
    }

    applyPaymentAvailability(profile);
}

function formatBrazilPhone(value) {
    const digits = onlyDigits(value);

    if (digits.length === 13 && digits.startsWith('55')) {
        return formatPhoneInput(digits.slice(2));
    }

    if (digits.length === 11 || digits.length === 10) {
        return formatPhoneInput(digits);
    }

    return value;
}

function applyPaymentAvailability(profile) {
    const pixButton = document.querySelector('.payment-button[data-method="pix"]');
    const cardButton = document.querySelector('.payment-button[data-method="card"]');
    const onsiteButton = document.querySelector('.payment-button[data-method="onsite"]');

    const paymentOptions = [
        {
            button: pixButton,
            method: 'pix',
            enabled: profile.payment_pix_enabled !== false
        },
        {
            button: cardButton,
            method: 'card',
            enabled: profile.payment_card_enabled !== false
        },
        {
            button: onsiteButton,
            method: 'onsite',
            enabled: profile.payment_onsite_enabled !== false
        }
    ];

    paymentOptions.forEach((option) => {
        if (!option.button) return;

        option.button.hidden = !option.enabled;
        option.button.disabled = !option.enabled;
    });

    const currentOption = paymentOptions.find((option) => option.method === state.paymentMethod);

    if (!currentOption || !currentOption.enabled) {
        const firstEnabled = paymentOptions.find((option) => option.enabled && option.button);

        if (firstEnabled) {
            state.paymentMethod = firstEnabled.method;

            document.querySelectorAll('.payment-button').forEach((button) => {
                button.classList.toggle('active', button.dataset.method === state.paymentMethod);
            });
        }
    }

    updatePaymentMessage();
    updateUI();
}


async function loadProfessionals() {
    const select = document.getElementById('professional-select');

    if (!select) return;

    try {
        const { data, error } = await supabaseClient
            .from('professionals')
            .select('id, name, is_active, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        state.professionals = Array.isArray(data) ? data : [];

        select.innerHTML = '<option value="">Qualquer profissional</option>';

        state.professionals.forEach((professional) => {
            const option = document.createElement('option');
            option.value = professional.id;
            option.textContent = professional.name;
            select.appendChild(option);
        });

        select.value = state.selectedProfessionalId || '';
    } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        select.innerHTML = '<option value="">Qualquer profissional</option>';
    }
}

async function loadServices() {
    const grid = document.getElementById('service-grid');
    const loading = document.getElementById('services-loading');

    if (!grid) return;

    if (loading) {
        loading.textContent = 'Carregando serviços...';
        loading.style.display = 'block';
    }

    grid.innerHTML = '';

    try {
        const { data, error } = await supabaseClient
            .from('services')
            .select('id, name, price, duration_minutes, icon_url, description, is_active, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            throw error;
        }

        state.services = Array.isArray(data) ? data : [];

        renderServices();

        if (loading) {
            loading.style.display = 'none';
        }
    } catch (error) {
        console.error(error);

        if (loading) {
            loading.textContent = 'Erro ao carregar serviços. Tente atualizar a página.';
            loading.style.display = 'block';
        }
    }
}

function renderServices() {
    const grid = document.getElementById('service-grid');

    if (!grid) return;

    if (!state.services.length) {
        grid.innerHTML = '<p class="slots-message">Nenhum serviço disponível no momento.</p>';
        return;
    }

    grid.innerHTML = state.services.map((service) => {
        const price = Number(service.price || 0);
        const isSelected = state.selectedServices.some((item) => item.id === service.id);
        const iconUrl = service.icon_url || 'assets/icons/corte.svg';

        return `
            <div class="service-card ${isSelected ? 'selected' : ''}" data-service-id="${escapeHtml(service.id)}">
                <div class="card-head">
                    <div class="service-title">
                        <span class="service-icon">
                            <img src="${escapeHtml(iconUrl)}" alt="">
                        </span>
                        <h3>${escapeHtml(service.name)}</h3>
                    </div>
                    <span class="price-tag">${formatCurrency(price)}</span>
                </div>
                <button class="service-select" type="button">
                    <span>${isSelected ? 'Selecionado' : 'Selecionar'}</span>
                    <span class="select-arrow">→</span>
                </button>
            </div>
        `;
    }).join('');
}

function toggleService(serviceId) {
    const service = state.services.find((item) => item.id === serviceId);

    if (!service) return;

    const alreadySelected = state.selectedServices.some((item) => item.id === serviceId);

    if (alreadySelected) {
        state.selectedServices = state.selectedServices.filter((item) => item.id !== serviceId);
    } else {
        state.selectedServices.push({
            id: service.id,
            name: service.name,
            price: Number(service.price || 0),
            duration_minutes: Number(service.duration_minutes || 45)
        });
    }

    state.totalPrice = state.selectedServices.reduce((sum, item) => {
        return sum + Number(item.price || 0);
    }, 0);

    renderServices();
    updateUI();
}

document.getElementById('service-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('.service-select');
    if (!button) return;

    const card = button.closest('.service-card');
    const serviceId = card?.dataset?.serviceId;

    if (!serviceId) return;

    toggleService(serviceId);
});

document.querySelectorAll('.payment-button').forEach((btn) => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;

        document.querySelectorAll('.payment-button').forEach((b) => {
            b.classList.toggle('active', b === btn);
        });

        updatePaymentMessage();
        updateUI();
    });
});

function updatePaymentMessage() {
    const paymentMessage = document.getElementById('payment-message');

    if (!paymentMessage) return;

    if (state.paymentMethod === 'onsite') {
        paymentMessage.textContent = 'Pague presencialmente no dia do atendimento.';
    } else if (state.paymentMethod === 'pix') {
        paymentMessage.textContent = 'Pagamento via Pix. Após pagar, envie o comprovante pelo WhatsApp.';
    } else if (state.paymentMethod === 'card') {
        paymentMessage.textContent = 'Pagamento seguro com cartão.';
    } else {
        paymentMessage.textContent = '';
    }
}

function updateUI() {
    const totalValue = document.getElementById('total-value');
    const confirmBtn = document.getElementById('confirm-btn');
    const clientName = document.getElementById('client-name');
    const clientPhone = document.getElementById('client-phone');

    if (totalValue) {
        totalValue.textContent = formatCurrency(state.totalPrice);
    }

    const hasServices = state.selectedServices.length > 0;
    const hasName = Boolean(clientName?.value.trim());
    const hasPhone = isValidBrazilPhone(clientPhone?.value);
    const hasDate = Boolean(state.selectedDate);
    const hasSlot = Boolean(state.selectedSlot?.start && state.selectedSlot?.end);
    const hasPaymentMethod = Boolean(state.paymentMethod);

    const ready = hasServices && hasName && hasPhone && hasDate && hasSlot && hasPaymentMethod;

    if (confirmBtn) {
        confirmBtn.disabled = !ready;
    }
}

document.getElementById('appointment-date')?.addEventListener('change', async (event) => {
    state.selectedDate = event.target.value;
    await loadAvailabilityByDate(state.selectedDate);
});

document.getElementById('client-name')?.addEventListener('input', updateUI);

document.getElementById('client-phone')?.addEventListener('input', (event) => {
    event.target.value = formatPhoneInput(event.target.value);
    updateUI();
});

async function createReservation() {
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();

    const paymentMethodMap = {
        pix: 'pix',
        card: 'card',
        onsite: 'pay_at_shop'
    };

    const paymentMethod = paymentMethodMap[state.paymentMethod];

    if (!paymentMethod) {
        throw new Error('Método de pagamento inválido.');
    }

    if (!isValidBrazilPhone(phone)) {
        throw new Error('Informe um WhatsApp válido.');
    }

    if (!state.selectedSlot?.start || !state.selectedSlot?.end) {
        throw new Error('Selecione um horário válido.');
    }

    const appointmentStart = normalizeDateTimeWithOffset(state.selectedSlot.start);
    const appointmentEnd = normalizeDateTimeWithOffset(state.selectedSlot.end);

    const response = await fetch(`${supabaseUrl}/functions/v1/criar-reserva`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
            client_name: name,
            client_phone: phone,
            selected_services: state.selectedServices,
            total_price: state.totalPrice,
            payment_method: paymentMethod,
            professional_id: state.selectedProfessionalId || null,
            appointment_start: appointmentStart,
            appointment_end: appointmentEnd
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.error || 'Falha ao criar reserva.');
    }

    return data;
}

async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');

    btn.textContent = 'Processando...';
    btn.disabled = true;

    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const services = state.selectedServices.map((s) => s.name).join(', ');
    const slotText = formatSlotForDisplay(state.selectedSlot);

    try {
        const reservation = await createReservation();

        if (state.paymentMethod === 'pix') {
            const payload = generatePixPayload(state.totalPrice);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;

            document.getElementById('qr-code-img').src = qrUrl;
            document.getElementById('pix-copy-paste').value = payload;
            document.getElementById('pix-modal').classList.add('open');

            document.getElementById('btn-check-payment').onclick = () => {
                const msg = `Olá! Já paguei via Pix.\nCliente: ${name}\nWhatsApp: ${phone}\nServiços: ${services}\nTotal: ${formatCurrency(state.totalPrice)}${slotText ? `\nHorário: ${slotText}` : ''}\nReserva: ${reservation.appointment_id}\nEnvio o comprovante para confirmar?`;
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            };

            await loadAvailabilityByDate(state.selectedDate);
        } else if (state.paymentMethod === 'card') {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: {
                    items: state.selectedServices,
                    method: 'card',
                    total: state.totalPrice
                }
            });

            if (error) throw error;

            window.location.href = data.init_point;
        } else if (state.paymentMethod === 'onsite') {
            showSuccessModal({
                reservationId: reservation.appointment_id,
                clientName: name,
                clientPhone: phone,
                services,
                slotText,
                paymentText: 'Pagar na barbearia'
            });

            await loadAvailabilityByDate(state.selectedDate);
        }
    } catch (err) {
        alert('Erro: ' + err.message);
    } finally {
        btn.textContent = 'Confirmar Agendamento';
        btn.disabled = false;
        updateUI();
    }
}

function showSuccessModal({ reservationId, clientName, clientPhone, services, slotText, paymentText }) {
    const modal = document.getElementById('success-modal');

    if (!modal) return;

    document.getElementById('success-client').textContent = clientName || '-';
    document.getElementById('success-phone').textContent = clientPhone || '-';
    document.getElementById('success-services').textContent = services || '-';
    document.getElementById('success-date-time').textContent = slotText || '-';
    document.getElementById('success-payment').textContent = paymentText || '-';
    document.getElementById('success-reservation-id').textContent = reservationId || '-';

    const whatsappBtn = document.getElementById('success-whatsapp-btn');

    if (whatsappBtn) {
        whatsappBtn.onclick = () => {
            const msg = `Olá! Acabei de fazer um agendamento.\nCliente: ${clientName}\nWhatsApp: ${clientPhone}\nServiços: ${services}\nHorário: ${slotText}\nPagamento: ${paymentText}\nReserva: ${reservationId}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
        };
    }

    modal.classList.add('open');
}

function closeSuccessModal() {
    document.getElementById('success-modal')?.classList.remove('open');
}

function resetBookingForm() {
    state.selectedServices = [];
    state.totalPrice = 0;
    state.selectedSlot = null;
    state.availabilitySlots = [];
    state.selectedDate = '';
    state.selectedProfessionalId = '';

    document.getElementById('client-name').value = '';
    document.getElementById('client-phone').value = '';
    document.getElementById('appointment-date').value = '';
    const professionalSelect = document.getElementById('professional-select');
    if (professionalSelect) professionalSelect.value = '';

    setAvailability('idle', 'Selecione uma data para ver horários');
    renderServices();
    renderSlots();
    updateUI();
}

function copyPixCode() {
    const input = document.getElementById('pix-copy-paste');

    input.select();
    navigator.clipboard.writeText(input.value);

    alert('Código copiado!');
}

function closePixModal() {
    document.getElementById('pix-modal').classList.remove('open');
}

document.getElementById('confirm-btn')?.addEventListener('click', confirmBooking);
document.getElementById('copy-pix-btn')?.addEventListener('click', copyPixCode);
document.getElementById('close-pix-modal')?.addEventListener('click', closePixModal);

document.getElementById('pix-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'pix-modal') closePixModal();
});

document.getElementById('close-success-modal')?.addEventListener('click', closeSuccessModal);

document.getElementById('success-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'success-modal') closeSuccessModal();
});

document.getElementById('success-new-booking-btn')?.addEventListener('click', () => {
    closeSuccessModal();
    resetBookingForm();
});

async function initializePage() {
    renderAvailabilityStatus();
    renderSlots();
    updatePaymentMessage();
    updateUI();
    await loadBarbershopProfile();
    await loadProfessionals();
    await loadServices();
}

initializePage();
