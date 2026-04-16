const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'SUA_ANON_KEY_AQUI'; // Mantenha sua chave atual
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = {
    selectedServices: [],
    totalPrice: 0,
    paymentMethod: 'pix'
};

// 1. SELEÇÃO MÚLTIPLA DE SERVIÇOS
document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        const name = card.dataset.service;
        const price = Number(card.dataset.price);

        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            card.querySelector('.service-select').textContent = "Selecionar";
            state.selectedServices = state.selectedServices.filter(s => s.name !== name);
            state.totalPrice -= price;
        } else {
            card.classList.add('selected');
            card.querySelector('.service-select').textContent = "Adicionado ✓";
            state.selectedServices.push({ name, price });
            state.totalPrice += price;
        }
        
        updateUI();
    });
});

// 2. ALTERNAR MÉTODOS DE PAGAMENTO
document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-button').forEach(b => b.classList.toggle('active', b === btn));
        updateUI();
    });
});

function updateUI() {
    document.getElementById('total-value').textContent = `R$ ${state.totalPrice.toFixed(2)}`;
    const hasServices = state.selectedServices.length > 0;
    document.getElementById('confirm-btn').disabled = !hasServices;
}

// 3. FUNÇÃO PRINCIPAL DE AGENDAMENTO
async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    btn.textContent = 'Processando...';
    btn.disabled = true;

    const servicosNomes = state.selectedServices.map(s => s.name).join(', ');
    const clientName = document.getElementById('client-name').value || 'Cliente';

    try {
        // Fluxo PIX: Modal no site
        if (state.paymentMethod === 'pix') {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { 
                    items: state.selectedServices.map(s => ({ title: s.name, quantity: 1, unit_price: s.price })),
                    total: state.totalPrice,
                    method: 'pix' 
                }
            });

            if (error) throw error;

            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.qr_code_base64}`;
            document.getElementById('pix-copy-paste').value = data.qr_code;
            document.getElementById('pix-modal').style.display = 'flex';

            document.getElementById('btn-check-payment').onclick = () => {
                const msg = `Olá! Fiz o Pix do agendamento:\n*Cliente:* ${clientName}\n*Serviços:* ${servicosNomes}\n*Total:* R$ ${state.totalPrice.toFixed(2)}`;
                window.open(`https://wa.me/5511915723418?text=${encodeURIComponent(msg)}`, '_blank');
                location.reload();
            };
        } 
        
        // Fluxo CARTÃO: Redireciona Mercado Pago
        else {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { 
                    items: state.selectedServices.map(s => ({ title: s.name, quantity: 1, unit_price: s.price })),
                    method: 'card' 
                }
            });

            if (error) throw error;
            if (data.init_point) {
                const msg = `Olá! Paguei via Cartão:\n*Cliente:* ${clientName}\n*Serviços:* ${servicosNomes}`;
                localStorage.setItem('zapAgendamento', `https://wa.me/5511915723418?text=${encodeURIComponent(msg)}`);
                window.location.href = data.init_point;
            }
        }
    } catch (err) {
        alert('Erro: ' + err.message);
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

document.getElementById('confirm-btn').addEventListener('click', confirmBooking);
