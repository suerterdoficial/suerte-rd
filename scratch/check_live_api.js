async function checkVercelLive() {
  try {
    const res1 = await fetch('https://suerte-rd-ashy.vercel.app/api/tickets');
    const data1 = await res1.json();
    console.log('Vercel suerte-rd-ashy tickets count:', Object.keys(data1.value || {}).length);

    const res2 = await fetch('https://www.suerterd.com.do/api/tickets');
    const data2 = await res2.json();
    console.log('Vercel suerterd.com.do tickets count:', Object.keys(data2.value || {}).length);
  } catch(e) {
    console.error('Error fetching live vercel:', e);
  }
}
checkVercelLive();
