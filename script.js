const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2kZ2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const PIX_KEY = '5511915723418';
const WHATSAPP_NUMBER = '5511915723418';
const MERCHANT_NAME = 'Barbearia Premium';
const MERCHANT_CITY = 'Sao Paulo';

const state = {
    selectedServices: [],
    totalPrice: 0,
    paymentMethod: 'pix'
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

    const merchantAccountInfo = emvField('26',
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

function formatAppointment(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

// Seleção de Serviços
document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        const name = card.dataset.service;
        const price = Number(card.dataset.price);

        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            state.selectedServices = state.selectedServices.filter(s => s.name !== name);
            state.totalPrice -= price;
        } else {
            card.classList.add('selected');
            state.selectedServices.push({ name, price });
            state.totalPrice += price;
        }
        updateUI();
    });
});

// Seleção de Pagamento
document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-button').forEach(b => b.classList.toggle('active', b === btn));
    });
});

function updateUI() {
    document.getElementById('total-value').textContent = `R$ ${state.totalPrice.toFixed(2)}`;
    const ready = state.selectedServices.length > 0 && document.getElementById('appointment').value && document.getElementById('client-name').value;
    document.getElementById('confirm-btn').disabled = !ready;
}

document.getElementById('appointment').addEventListener('change', updateUI);
document.getElementById('client-name').addEventListener('input', updateUI);

async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    btn.textContent = 'Processando...';
    btn.disabled = true;

    const name = document.getElementById('client-name').value;
    const services = state.selectedServices.map(s => s.name).join(', ');
    const appointment = document.getElementById('appointment').value;

    try {
        if (state.paymentMethod === 'pix') {
            const payload = generatePixPayload(state.totalPrice);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;

            document.getElementById('qr-code-img').src = qrUrl;
            document.getElementById('pix-copy-paste').value = payload;
            document.getElementById('pix-modal').classList.add('open');

            document.getElementById('btn-check-payment').onclick = () => {
                const formattedAppointment = formatAppointment(appointment);
                const msg = `Olá! Já paguei via Pix.\nCliente: ${name}\nServiços: ${services}\nTotal: R$ ${state.totalPrice.toFixed(2)}${formattedAppointment ? `\nHorário: ${formattedAppointment}` : ''}\nEnvio o comprovante para confirmar?`;
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            };
        } else {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { items: state.selectedServices, method: 'card', total: state.totalPrice }
            });

            if (error) throw error;
            window.location.href = data.init_point;
        }
    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.textContent = 'Confirmar Agendamento';
        btn.disabled = false;
    }
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

document.getElementById('confirm-btn').addEventListener('click', confirmBooking);
document.getElementById('copy-pix-btn')?.addEventListener('click', copyPixCode);
document.getElementById('close-pix-modal')?.addEventListener('click', closePixModal);
document.getElementById('pix-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'pix-modal') closePixModal();
});
