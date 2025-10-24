const UniversalScraper = require('./src/services/universalScraper');

async function debugTest() {
  try {
    console.log('Testing afamily.vn...\n');
    const scraper = new UniversalScraper();
    
    console.log('Step 1: Getting article links...');
    const links = await scraper.scrapeListPage('https://afamily.vn/giao-duc.htm');
    console.log(`Found ${links.length} links`);
    if (links.length > 0) {
      console.log('First 3 links:');
      links.slice(0, 3).forEach(link => console.log('  -', link));
      
      console.log('\nStep 2: Scraping first article...');
      const article = await scraper.scrapeArticle(links[0]);
      console.log('\nArticle data:');
      console.log(JSON.stringify(article, null, 2));
    } else {
      console.log('No links found! Testing with Puppeteer...');
      const PuppeteerScraper = require('./src/services/puppeteerScraper');
      const pScraper = new PuppeteerScraper();
      const pLinks = await pScraper.scrapeListPage('https://afamily.vn/giao-duc.htm');
      console.log(`Puppeteer found ${pLinks.length} links`);
      if (pLinks.length > 0) {
        console.log('First 3 links:');
        pLinks.slice(0, 3).forEach(link => console.log('  -', link));
        
        console.log('\nScraping first article with Puppeteer...');
        const pArticle = await pScraper.scrapeArticle(pLinks[0]);
        console.log('\nArticle data:');
        console.log(JSON.stringify(pArticle, null, 2));
      }
      await pScraper.closeBrowser();
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
}

debugTest();
