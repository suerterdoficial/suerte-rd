async function createUpstashDb() {
  try {
    const res = await fetch('https://upstash.com/start-redis', { method: 'POST' });
    const text = await res.text();
    console.log('Upstash Creation Response:\n', text);
  } catch (e) {
    console.error('Error creating Upstash Redis:', e);
  }
}

createUpstashDb();
