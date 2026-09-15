const data = require('../data.json');
const ticketsStr = data['suerterd:tickets:v2:florida5'] || '{}';
const tickets = JSON.parse(ticketsStr);

console.log('Total ticket entries in data.json:', Object.keys(tickets).length);

function getGroupKeyForTicket(t) {
  if (t.groupKey) return t.groupKey;
  if (t.orderId) return t.orderId;
  if (t.paquete) return `${t.name}_${t.paquete}_${t.timestamp || t.fecha}`;
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
Object.entries(tickets).forEach(([numStr, t]) => {
  const gKey = getGroupKeyForTicket(t);
  if (!groupsMap[gKey]) {
    groupsMap[gKey] = { name: t.name || t.nombre, paquete: t.packageLabel || t.paquete, estado: t.estado, tickets: [] };
  }
  groupsMap[gKey].tickets.push(numStr);
});

console.log('Total order groups count:', Object.keys(groupsMap).length);
console.log('Groups breakdown:');
Object.entries(groupsMap).forEach(([gKey, g]) => {
  console.log(`- Group [${gKey}]: ${g.name} | ${g.paquete} | estado: ${g.estado} | count: ${g.tickets.length}`);
});
