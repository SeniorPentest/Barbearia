const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = { service: null, price: 0, datetime: '', paymentMethod: null };

function updateSummary() {
    const ready = state.service && state.datetime && state.paymentMethod;
    document.getElementById('confirm-btn').disabled = !ready;
    document.getElementById('total-value').textContent = `R$ ${state.price.toFixed(2)}`;
}

document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        state.service = card.dataset.service;
        state.price = Number(card.dataset.price);
        updateSummary();
    });
});

document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-form').forEach(f => f.style.display = f.dataset.method === state.paymentMethod ? 'block' : 'none');
        updateSummary();
    });
});

document.getElementById('appointment').addEventListener('change', (e) => {
    state.datetime = e.target.value;
    updateSummary();
});

async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    btn.textContent = 'Processando...';
    btn.disabled = true;

    const message = `Agendamento: ${state.service}\nData: ${state.datetime}\nPagamento: ${state.paymentMethod}`;
    const whatsappUrl = `https://wa.me/5511915723418?text=${encodeURIComponent(message)}`;

    if (state.paymentMethod === 'pix' || state.paymentMethod === 'card') {
        try {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { 
                    items: [{ title: state.service, quantity: 1, unit_price: state.price }],
                    email: 'cliente@barbearia.com',
                    method: state.paymentMethod // ENVIANDO O MÉTODO ESCOLHIDO
                }
            });

            if (data?.init_point) {
                window.open(whatsappUrl, '_blank');
                window.location.href = data.init_point;
            }
        } catch (err) {
            alert('Erro ao gerar pagamento.');
            btn.textContent = 'Confirmar agendamento';
            btn.disabled = false;
        }
    } else {
        window.open(whatsappUrl, '_blank');
        alert('Agendado com sucesso!');
    }
}

document.getElementById('confirm-btn').addEventListener('click', confirmBooking);
