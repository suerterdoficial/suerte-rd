const fetch = globalThis.fetch || require('node-fetch');

async function checkLive() {
  console.log("Checking https://suerte-rd-ashy.vercel.app ...");
  const res = await fetch('https://suerte-rd-ashy.vercel.app/?t=' + Date.now());
  const html = await res.text();
  console.log("HTML length:", html.length);
  
  const phonesInHTML = html.match(/\+?\d[\d\s\(\)\-]{7,15}\d/g) || [];
  console.log("Phone numbers found in HTML:", phonesInHTML);
  
  const placeholders = html.match(/placeholder="[^"]+"/g) || [];
  console.log("Placeholders found in HTML:", placeholders);
  
  const scriptTags = html.match(/<script src="[^"]+"/g) || [];
  console.log("Script tags in HTML:", scriptTags);

  const resJS = await fetch('https://suerte-rd-ashy.vercel.app/assets/js/app.js?v=' + Date.now());
  const js = await resJS.text();
  console.log("\nJS length:", js.length);
  console.log("JS contains 18099838626:", js.includes("18099838626"));
  console.log("JS contains 8099838626:", js.includes("8099838626"));
  const phonesInJS = js.match(/1809\d+/g) || [];
  console.log("Phone matches in JS:", Array.from(new Set(phonesInJS)));
}

checkLive().catch(console.error);
