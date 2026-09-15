async function testCloudKV() {
  console.log('Testing persistent cloud KV storage...');
  
  // We can use Upstash Redis or KV REST API endpoint
  const testUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const testToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  console.log('Current KV_REST_API_URL:', testUrl ? 'Configured' : 'NOT CONFIGURED');
  console.log('Current KV_REST_API_TOKEN:', testToken ? 'Configured' : 'NOT CONFIGURED');
}

testCloudKV();
