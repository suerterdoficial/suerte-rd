async function testClientCheckout() {
  console.log('--- Probando Checkout del Cliente ---');
  try {
    const timestamp = Date.now();
    const testTickets = ['88801', '88802', '88803', '88804', '88805', '88806', '88807', '88808', '88809', '88810'];
    const testGroupKey = `order_test_${timestamp}_client`;

    // Simular el POST exacto que realiza app.js en submitReservation()
    const payload = {
      raffleId: 'florida5',
      name: 'Cliente Test Paquete Nuevo',
      whatsapp: '8091112233',
      loteria: 'Pick 5 Florida',
      tickets: testTickets,
      estado: 'esperando_validacion',
      packageLabel: 'Paquete Bronce (10 Boletos)',
      comprobante: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      groupKey: testGroupKey
    };

    console.log('Enviando reservacion desde cliente simulado...');
    const res = await fetch('http://localhost:8000/api/tickets/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resData = await res.json();
    console.log('Respuesta del servidor:', resData);

    // Consultar /api/tickets para ver cómo se agrupa en admin.js
    const getRes = await fetch('http://localhost:8000/api/tickets?raffleId=florida5');
    const getData = await getRes.json();
    const ticketsObj = getData.value || {};

    console.log('\nVerificando tickets creados:');
    testTickets.forEach(num => {
      const t = ticketsObj[num];
      if (t) {
        console.log(`- Ticket #${num}: name=${t.name}, estado=${t.estado}, groupKey=${t.groupKey}, fecha=${t.fecha}`);
      } else {
        console.error(`❌ NO SE ENCONTRÓ EL TICKET #${num}`);
      }
    });

    // Ahora simular la agrupacion de admin.js
    function getGroupKeyForTicket(t) {
      if (t.groupKey) return t.groupKey;
      if (t.orderId) return t.orderId;
      const cleanPhone = (t.whatsapp || t.phone || '').replace(/\D/g, '');
      const phoneKey = cleanPhone || (t.name || t.nombre || 'anon').toLowerCase().replace(/\s+/g, '');
      let timeKey = '0';
      const rawDate = t.fecha || t.timestamp_reserva || t.timestamp;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          timeKey = Math.floor(d.getTime() / (10 * 60 * 1000));
        }
      }
      return `${phoneKey}_${timeKey}`;
    }

    const groupsMap = {};
    Object.entries(ticketsObj).forEach(([numStr, t]) => {
      if (!t) return;
      const gKey = getGroupKeyForTicket(t);
      if (!groupsMap[gKey]) {
        groupsMap[gKey] = {
          groupKey: gKey,
          name: t.name || t.nombre || 'Cliente',
          whatsapp: t.whatsapp || t.phone || '',
          paquete: t.packageLabel || t.paquete || 'Personalizado',
          estado: t.estado || 'reservado',
          tickets: []
        };
      }
      groupsMap[gKey].tickets.push(numStr);
      if (t.estado === 'esperando_validacion') groupsMap[gKey].estado = 'esperando_validacion';
    });

    const groups = Object.values(groupsMap);
    console.log('\nTotal de órdenes grupales registradas en Admin:', groups.length);
    const pendingGroups = groups.filter(g => g.estado === 'esperando_validacion' || g.estado === 'reservado');
    console.log('Total de órdenes Pendientes (Badge Admin):', pendingGroups.length);

    // Limpiar boletos de prueba
    await fetch('http://localhost:8000/api/tickets/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raffleId: 'florida5',
        tickets: testTickets,
        action: 'delete',
        status: 'deleted'
      })
    });

    console.log('\n✅ Prueba completada con exito.');
  } catch (err) {
    console.error('Error en testClientCheckout:', err);
  }
}

testClientCheckout();
