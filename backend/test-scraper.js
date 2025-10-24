const UniversalScraper = require('./src/services/universalScraper');

async function test() {
  const scraper = new UniversalScraper({ usePuppeteer: 'auto' });
  
  console.log('Testing with afamily.vn...');
  const articles = await scraper.scrapeAll('https://afamily.vn/giao-duc.htm');
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Total articles: ${articles.length}`);
  
  if (articles.length > 0) {
    console.log(`\n=== FIRST ARTICLE ===`);
    console.log(JSON.stringify(articles[0], null, 2));
    
    console.log(`\n=== VALIDATION ===`);
    const first = articles[0];
    console.log('✓ title:', first.title ? 'OK' : 'MISSING');
    console.log('✓ summary:', first.summary ? 'OK' : 'MISSING');
    console.log('✓ content:', first.content && first.content.length > 100 ? 'OK' : 'MISSING/SHORT');
    console.log('✓ authors:', first.authors ? 'OK' : 'MISSING');
    console.log('✓ category_slug:', first.category_slug ? 'OK' : 'MISSING');
    console.log('✓ slug:', first.slug ? 'OK' : 'MISSING');
    console.log('✓ external_source:', first.external_source ? 'OK' : 'MISSING');
    console.log('✓ image.url:', first.image?.url ? 'OK' : 'MISSING');
    console.log('✓ image.caption:', first.image?.caption !== undefined ? 'OK' : 'MISSING');
    console.log('✓ tags:', Array.isArray(first.tags) ? 'OK' : 'MISSING');
    console.log('✓ likes:', typeof first.likes === 'number' ? 'OK' : 'MISSING');
    console.log('✓ state:', first.state ? 'OK' : 'MISSING');
    console.log('✓ created_at:', typeof first.created_at === 'number' ? 'OK' : 'MISSING');
  }
  
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
