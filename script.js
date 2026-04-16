const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const state = {
    selectedServices: [], // Agora é um array (lista) de serviços
    totalPrice: 0,
    datetime: '',
    professional: '',
    paymentMethod: null
};

// DETECTOR DE PAGAMENTO APROVADO
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('collection_status');

    if (paymentStatus === 'approved') {
        const zapUrl = localStorage.getItem('zapAgendamento');
        if (zapUrl) {
            alert("Pagamento confirmado pelo Mercado Pago! Vamos avisar a barbearia agora.");
            window.open(zapUrl, '_blank');
            localStorage.removeItem('zapAgendamento');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } else if (paymentStatus === 'rejected' || paymentStatus === 'null') {
        alert("O pagamento não foi concluído. Tente novamente.");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return 'Escolha data e hora';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Escolha data e hora';
    return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function updateSummary() {
    // Só libera o botão se tiver pelo menos 1 serviço, data e método
    const ready = state.selectedServices.length > 0 && state.datetime && state.paymentMethod;
    const btn = document.getElementById('confirm-btn');
    if (btn) btn.disabled = !ready;

    const totalEl = document.getElementById('total-value');
    if (totalEl) totalEl.textContent = formatCurrency(state.totalPrice);
}

// SELEÇÃO MÚLTIPLA DE SERVIÇOS
document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        const serviceName = card.dataset.service;
        const servicePrice = Number(card.dataset.price);

        // Se já está selecionado, remove. Se não, adiciona.
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            card.querySelector('.service-select').textContent = "Selecionar";
            state.selectedServices = state.selectedServices.filter(s => s.name !== serviceName);
            state.totalPrice -= servicePrice;
        } else {
            card.classList.add('selected');
            card.querySelector('.service-select').textContent = "Adicionado ✓";
            state.selectedServices.push({ name: serviceName, price: servicePrice });
            state.totalPrice += servicePrice;
        }
        
        updateSummary();
    });
});

// Seleção de Pagamento
document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        
        document.querySelectorAll('.payment-button').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.payment-form').forEach(f => {
            f.style.display = f.dataset.method === state.paymentMethod ? 'block' : 'none';
        });
        updateSummary();
    });
});

document.getElementById('appointment')?.addEventListener('change', (e) => {
    state.datetime = e.target.value;
    updateSummary();
});

document.getElementById('professional')?.addEventListener('change', (e) => {
    state.professional = e.target.value;
    updateSummary();
});

// INTEGRAÇÃO MP + WHATSAPP
async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    btn.textContent = 'Processando...';
    btn.disabled = true;

    const clientName = document.getElementById('client-name')?.value.trim() || 'Cliente';
    const dateLabel = formatDate(state.datetime);
    const professional = state.professional || 'primeiro disponível';
    const paymentLabel = state.paymentMethod === 'pix' ? 'Pix' : state.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro na barbearia';

    // Formata a lista de serviços para o Zap
    const servicosNomes = state.selectedServices.map(s => s.name).join(', ');

    const message = `Olá! Sou ${clientName}. Acabei de confirmar e pagar meu agendamento:\n\n*Serviços:* ${servicosNomes}\n*Data:* ${dateLabel}\n*Profissional:* ${professional}\n*Total:* ${formatCurrency(state.totalPrice)}\n*Pagamento:* ${paymentLabel}`;
    const whatsappUrl = `https://wa.me/5511915723418?text=${encodeURIComponent(message)}`;

    if (state.paymentMethod === 'pix' || state.paymentMethod === 'card') {
        try {
            localStorage.setItem('zapAgendamento', whatsappUrl);

            // Monta o array de itens para enviar ao MP
            const mpItems = state.selectedServices.map(s => ({
                title: s.name,
                quantity: 1,
                unit_price: s.price
            }));

            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { 
                    items: mpItems,
                    email: 'cliente@barbearia.com',
                    method: state.paymentMethod 
                }
            });

            if (error) throw error;

            if (data?.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error('Link não gerado.');
            }
        } catch (err) {
            console.error('Erro:', err);
            alert('Erro ao gerar pagamento no Mercado Pago. Tente novamente.');
            btn.textContent = 'Confirmar agendamento';
            btn.disabled = false;
        }
    } else {
        window.open(whatsappUrl, '_blank');
        alert('Agendado com sucesso! Te aguardamos na barbearia.');
        btn.textContent = 'Confirmar agendamento';
        btn.disabled = false;
    }
}

document.getElementById('confirm-btn')?.addEventListener('click', confirmBooking);

const pixBtn = document.querySelector('.payment-button[data-method="pix"]');
if (pixBtn) pixBtn.click();
