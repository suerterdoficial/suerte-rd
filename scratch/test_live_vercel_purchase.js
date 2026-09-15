async function testLiveVercelPurchase() {
  console.log('Sending test purchase to https://www.suerterd.com.do/api/tickets/reserve ...');
  
  const testGroupKey = `order_live_vercel_${Date.now()}`;
  const testTickets = ['99970', '99971'];

  try {
    const res = await fetch('https://www.suerterd.com.do/api/tickets/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raffleId: 'florida5',
        name: 'Cliente Prueba Vercel En Vivo',
        whatsapp: '8099838626',
        loteria: 'Pick 5 Florida',
        tickets: testTickets,
        packageLabel: 'Paquete Diamante (100 Boletos)',
        estado: 'esperando_validacion',
        comprobante: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        groupKey: testGroupKey
      })
    });

    const data = await res.json();
    console.log('Vercel Reserve API Response:', data);

    // Verify GET /api/tickets from Vercel
    const getRes = await fetch('https://www.suerterd.com.do/api/tickets?raffleId=florida5&_t=' + Date.now());
    const getData = await getRes.json();
    const ticketsObj = getData.value || {};

    const t0 = ticketsObj['99970'];
    console.log('Ticket #99970 read back from Vercel:', t0 ? { name: t0.name, groupKey: t0.groupKey, estado: t0.estado } : 'NOT FOUND');

    if (t0) {
      console.log('====================================================');
      console.log(' 🎉 ÉXITO TOTAL: LA COMPRA SE GUARDÓ EN VERCEL EN VIVO!');
      console.log('====================================================');
      
      // Clean up test tickets
      await fetch('https://www.suerterd.com.do/api/tickets/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: 'florida5',
          tickets: testTickets,
          action: 'delete',
          status: 'deleted'
        })
      });
    } else {
      console.log('⚠️ Vercel may still be building the deployment...');
    }

  } catch (e) {
    console.error('Error during Vercel live test:', e);
  }
}

testLiveVercelPurchase();
