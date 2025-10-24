const axios = require('axios');
const cheerio = require('cheerio');

async function simpleTest() {
  console.log('Testing basic scraping on afamily.vn...');
  
  try {
    const response = await axios.get('https://afamily.vn/giao-duc.htm', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const links = [];
    
    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && href.includes('afamily.vn') && !href.includes('video')) {
        links.push(href);
      }
    });
    
    console.log(`Found ${links.length} total links`);
    console.log('Sample links:');
    links.slice(0, 5).forEach(link => console.log('  -', link));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

simpleTest();
