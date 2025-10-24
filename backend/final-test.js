const UniversalScraper = require('./src/services/universalScraper');
const fs = require('fs');

async function finalTest() {
  const output = [];
  const log = (msg) => {
    console.log(msg);
    output.push(msg);
  };

  try {
    log('Starting test...');
    const scraper = new UniversalScraper();
    const articles = await scraper.scrapeAll('https://afamily.vn/giao-duc.htm');
    
    log('\n=== RESULTS ===');
    log('Articles found: ' + articles.length);
    
    if (articles.length > 0) {
      log('\n=== FIRST ARTICLE STRUCTURE ===');
      const sample = articles[0];
      log(JSON.stringify({
        title: sample.title?.substring(0, 80) + '...',
        authors: sample.authors,
        category_slug: sample.category_slug,
        slug: sample.slug?.substring(0, 50) + '...',
        content_length: sample.content?.length,
        summary_length: sample.summary?.length,
        created_at: sample.created_at,
        external_source: sample.external_source,
        state: sample.state,
        image_url: sample.image?.url?.substring(0, 50) + '...',
        image_caption: sample.image?.caption,
        tags_count: sample.tags?.length,
        likes: sample.likes,
        source_domain: sample.source_domain
      }, null, 2));
      
      log('\n=== FIELD VALIDATION ===');
      log('✓ title: ' + (sample.title ? 'OK' : 'MISSING'));
      log('✓ authors: ' + (sample.authors ? 'OK' : 'MISSING'));
      log('✓ category_slug: ' + (sample.category_slug ? 'OK' : 'MISSING'));
      log('✓ content: ' + (sample.content?.length > 100 ? 'OK' : 'MISSING/SHORT'));
      log('✓ summary: ' + (sample.summary ? 'OK' : 'MISSING'));
      log('✓ created_at: ' + (typeof sample.created_at === 'number' ? 'OK' : 'MISSING'));
      log('✓ external_source: ' + (sample.external_source ? 'OK' : 'MISSING'));
      log('✓ image.url: ' + (sample.image?.url ? 'OK' : 'MISSING'));
      log('✓ image.caption: ' + (sample.image?.caption !== undefined ? 'OK' : 'MISSING'));
      log('✓ tags: ' + (Array.isArray(sample.tags) ? 'OK' : 'MISSING'));
      log('✓ likes: ' + (typeof sample.likes === 'number' ? 'OK' : 'MISSING'));
      log('✓ state: ' + (sample.state === 'global' ? 'OK' : 'MISSING'));
      log('✓ slug: ' + (sample.slug ? 'OK' : 'MISSING'));
    }
    
    fs.writeFileSync('test-results.txt', output.join('\n'));
    log('\n✅ Test completed! Results saved to test-results.txt');
  } catch (error) {
    log('❌ Error: ' + error.message);
    log(error.stack);
    fs.writeFileSync('test-results.txt', output.join('\n'));
  }
  process.exit(0);
}

finalTest();
