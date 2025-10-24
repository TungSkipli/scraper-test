const UniversalScraper = require('./src/services/universalScraper');

async function quickTest() {
  try {
    console.log('Starting test...');
    const scraper = new UniversalScraper();
    const articles = await scraper.scrapeAll('https://afamily.vn/giao-duc.htm');
    
    console.log('\n=== RESULTS ===');
    console.log('Articles found:', articles.length);
    
    if (articles.length > 0) {
      console.log('\n=== SAMPLE ARTICLE ===');
      const sample = articles[0];
      console.log(JSON.stringify({
        title: sample.title?.substring(0, 100),
        authors: sample.authors,
        category_slug: sample.category_slug,
        content_length: sample.content?.length,
        created_at: sample.created_at,
        external_source: sample.external_source,
        state: sample.state,
        has_image: !!sample.image?.url,
        tags_count: sample.tags?.length,
        likes: sample.likes
      }, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
}

quickTest();
