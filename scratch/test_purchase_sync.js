async function runTest() {
  console.log('Testing against local server on port 8000...');

  try {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const testGroupKey = `order_test_${Date.now()}_${randomSuffix}`;

    const testPayload = {
      raffleId: 'florida5',
      name: 'Cliente Prueba Unica',
      whatsapp: '8097779999',
      loteria: 'Pick 5 Florida',
      tickets: ['99980', '99981'],
      packageLabel: 'Paquete Diamante (100 Boletos)',
      estado: 'esperando_validacion',
      comprobante: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      groupKey: testGroupKey
    };

    // 1. Enviar reserva de boletos
    const resReserve = await fetch('http://localhost:8000/api/tickets/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    const dataReserve = await resReserve.json();
    console.log('Reserve Response:', dataReserve);

    if (!dataReserve.success) {
      throw new Error('Falló la reserva de tickets');
    }

    // 2. Obtener boletos y verificar que se creó un nuevo grupo con comprobante y fecha
    const resTickets = await fetch('http://localhost:8000/api/tickets?raffleId=florida5');
    const dataTickets = await resTickets.json();

    const t0 = dataTickets.value['99980'];
    console.log('Ticket 99980:', { name: t0?.name, groupKey: t0?.groupKey, fecha: t0?.fecha, comprobanteLen: t0?.comprobante?.length });

    if (!t0) throw new Error('El boleto 99980 no fue encontrado');
    if (t0.groupKey !== testGroupKey) throw new Error(`El groupKey no coincide. Se esperaba ${testGroupKey}, se obtuvo ${t0.groupKey}`);
    if (!t0.comprobante || t0.comprobante.length < 20) throw new Error('Comprobante missing o muy corto');

    // Clean up test tickets
    await fetch('http://localhost:8000/api/tickets/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raffleId: 'florida5',
        tickets: ['99980', '99981'],
        action: 'delete',
        status: 'deleted'
      })
    });

    console.log('==============================================');
    console.log('   PRUEBA COMPLETADA CON ÉXITO Y GRUPO UNICO  ');
    console.log('==============================================');

  } catch (err) {
    console.error('Error en prueba:', err);
    process.exitCode = 1;
  }
}

runTest();
