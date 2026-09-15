const data = require('../data.json');

const UPSTASH_URL = "https://obliging-racer-128583.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAfZHAQIgcDI3M2I5NWYwNmU1MjU0YzUwODk4MTE1ZDY5YWM2MjkyZg";

async function seedCloudDb() {
  console.log('Migrating data.json to Upstash Cloud Redis...');
  try {
    const res = await fetch(`${UPSTASH_URL}/set/suerterd_db`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: JSON.stringify(data) })
    });
    const resData = await res.json();
    console.log('Upstash Seed Response:', resData);

    // Test GET
    const getRes = await fetch(`${UPSTASH_URL}/get/suerterd_db`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const getData = await getRes.json();
    const fetchedDb = typeof getData.result === 'string' ? JSON.parse(getData.result) : getData.result;
    
    const tickets = JSON.parse(fetchedDb['suerterd:tickets:v2:florida5'] || '{}');
    console.log('SUCCESS! Fetched tickets count from cloud Redis:', Object.keys(tickets).length);

  } catch (e) {
    console.error('Error seeding cloud DB:', e);
  }
}

seedCloudDb();
