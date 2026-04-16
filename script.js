const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = { selectedServices: [], totalPrice: 0, paymentMethod: 'pix' };

document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        const name = card.dataset.service, price = Number(card.dataset.price);
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            state.selectedServices = state.selectedServices.filter(s => s.name !== name);
            state.totalPrice -= price;
        } else {
            card.classList.add('selected');
            state.selectedServices.push({ name, price });
            state.totalPrice += price;
        }
        document.getElementById('total-value').textContent = `R$ ${state.totalPrice.toFixed(2)}`;
        document.getElementById('confirm-btn').disabled = state.selectedServices.length === 0;
    });
});

document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-button').forEach(b => b.classList.toggle('active', b === btn));
    });
});

async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    btn.textContent = 'Processando...'; btn.disabled = true;
    try {
        const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
            body: { items: state.selectedServices, total: state.totalPrice, method: state.paymentMethod }
        });
        if (error) throw error;
        if (state.paymentMethod === 'pix') {
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.qr_code_base64}`;
            document.getElementById('pix-copy-paste').value = data.qr_code;
            document.getElementById('pix-modal').style.display = 'flex';
            document.getElementById('btn-check-payment').onclick = () => {
                const msg = `Olá! Fiz o Pix de R$ ${state.totalPrice.toFixed(2)} para os serviços: ${state.selectedServices.map(s => s.name).join(', ')}`;
                window.open(`https://wa.me/5511915723418?text=${encodeURIComponent(msg)}`, '_blank');
                location.reload();
            };
        } else {
            window.location.href = data.init_point;
        }
    } catch (err) { alert('Erro: ' + err.message); btn.textContent = 'Confirmar Agendamento'; btn.disabled = false; }
}

function copyPixCode() {
    const input = document.getElementById('pix-copy-paste');
    input.select(); navigator.clipboard.writeText(input.value); alert('Copiado!');
}

document.getElementById('confirm-btn').addEventListener('click', confirmBooking);
