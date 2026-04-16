async function confirmBooking() {
    if (!isReadyToConfirm()) return;

    const confirmBtn = els.confirmBtn;
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Gerando pagamento seguro...';
    confirmBtn.disabled = true;

    const dateLabel = formatDate(state.datetime);
    const professional = state.professional || 'primeiro disponível';
    const paymentLabel = state.paymentMethod === 'pix' ? 'Pix'
        : state.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro na barbearia';

    // 1. Monta a mensagem do WhatsApp (já com o seu número)
    const messageText = `Olá! Gostaria de confirmar meu agendamento:\n\n*Serviço:* ${state.service}\n*Data:* ${dateLabel}\n*Profissional:* ${professional}\n*Pagamento:* ${paymentLabel}`;
    const whatsappUrl = `https://wa.me/5511915723418?text=${encodeURIComponent(messageText)}`;

    // 2. Lógica: Se for Cartão ou Pix, chama o Mercado Pago!
    if (state.paymentMethod === 'card' || state.paymentMethod === 'pix') {
        try {
            // Empacota o serviço escolhido pro MP entender
            const items = [{
                title: `Agendamento: ${state.service} com ${professional}`,
                quantity: 1,
                unit_price: state.price
            }];

            const { data: { session } } = await supabaseClient.auth.getSession();
            const email = session?.user?.email || 'cliente@visitante.com';

            // CHAMA A SUA EDGE FUNCTION NA NUVEM!
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { items, email }
            });

            if (error) throw error;

            if (data?.init_point) {
                // Abre o WhatsApp em uma nova aba
                window.open(whatsappUrl, '_blank');
                // Redireciona a tela atual para o checkout do Mercado Pago
                window.location.href = data.init_point;
            } else {
                throw new Error('Link não gerado.');
            }
        } catch (err) {
            console.error('Erro no pagamento:', err);
            alert('Erro ao conectar com o Mercado Pago. Tente novamente.');
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    } else {
        // Se a pessoa escolheu pagar em "Dinheiro", só abre o WhatsApp
        window.open(whatsappUrl, '_blank');
        setStatus('Agendamento confirmado', 'success');
        if (els.feedback) els.feedback.textContent = 'Redirecionando para o WhatsApp...';
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}
