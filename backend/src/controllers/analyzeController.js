const PuppeteerScraper = require('../services/puppeteerScraper');
const SelectorCache = require('../services/selectorCache');

const selectorCache = new SelectorCache();

exports.analyzeStructure = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    console.log(`[Step 1] Analyzing DOM structure for: ${url}`);
    
    const scraper = new PuppeteerScraper();
    const browser = await scraper.initBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await scraper.delay(2000);
    
    const analysis = await scraper.domAnalyzer.analyzePageStructure(page);
    const generatedSelector = scraper.domAnalyzer.generateOptimalSelector(analysis);
    
    await page.close();
    await scraper.closeBrowser();

    res.json({
      success: true,
      message: 'DOM analysis completed',
      url,
      analysis: {
        totalContainersFound: analysis.linkContainers.length,
        linkStats: analysis.linkStats,
        topContainers: analysis.linkContainers.slice(0, 10).map(c => ({
          tagName: c.tagName,
          className: c.className,
          id: c.id,
          linkCount: c.linkCount,
          score: c.score,
          selector: c.selector
        })),
        detectedSelectors: analysis.detectedSelectors,
        generatedSelector
      }
    });

  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.extractLinks = async (req, res) => {
  try {
    const { url, selector } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    console.log(`[Step 2] Extracting links from: ${url}`);
    
    const scraper = new PuppeteerScraper();
    
    let links;
    if (selector) {
      console.log(`Using provided selector: ${selector}`);
      const browser = await scraper.initBrowser();
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await scraper.delay(2000);
      
      links = await scraper.domAnalyzer.extractLinksWithSelector(page, selector, url);
      
      await page.close();
      await scraper.closeBrowser();
    } else {
      links = await scraper.scrapeListPage(url);
      await scraper.closeBrowser();
    }

    res.json({
      success: true,
      message: 'Links extracted',
      url,
      selector: selector || 'auto-detected',
      count: links.length,
      links: links.slice(0, 20),
      totalLinks: links.length
    });

  } catch (error) {
    console.error('Extract links error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.testSelector = async (req, res) => {
  try {
    const { url, selector } = req.body;
    
    if (!url || !selector) {
      return res.status(400).json({
        success: false,
        message: 'Both URL and selector are required'
      });
    }

    console.log(`[Step 3] Testing selector "${selector}" on ${url}`);
    
    const scraper = new PuppeteerScraper();
    const browser = await scraper.initBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await scraper.delay(2000);
    
    const matchCount = await scraper.domAnalyzer.testSelector(page, selector);
    const links = await scraper.domAnalyzer.extractLinksWithSelector(page, selector, url);
    
    await page.close();
    await scraper.closeBrowser();

    res.json({
      success: true,
      message: 'Selector tested',
      url,
      selector,
      test: {
        elementsMatched: matchCount,
        linksExtracted: links.length,
        isValid: links.length > 0,
        sampleLinks: links.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Test selector error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      selector
    });
  }
};

exports.scrapeSingleArticle = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Article URL is required'
      });
    }

    console.log(`[Step 4] Scraping single article: ${url}`);
    
    const scraper = new PuppeteerScraper();
    const article = await scraper.scrapeArticle(url);
    await scraper.closeBrowser();

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Could not extract article data'
      });
    }

    res.json({
      success: true,
      message: 'Article scraped successfully',
      url,
      article
    });

  } catch (error) {
    console.error('Scrape single article error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCache = async (req, res) => {
  try {
    const stats = await selectorCache.getStats();

    res.json({
      success: true,
      message: 'Selector cache retrieved',
      cache: stats
    });

  } catch (error) {
    console.error('Get cache error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCacheByDomain = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL query parameter is required'
      });
    }

    const selector = await selectorCache.get(url);
    const domain = selectorCache.getDomain(url);

    res.json({
      success: true,
      message: selector ? 'Cached selector found' : 'No cache found for this domain',
      domain,
      selector,
      cached: !!selector
    });

  } catch (error) {
    console.error('Get cache by domain error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.saveToCache = async (req, res) => {
  try {
    const { url, selector, metadata = {} } = req.body;
    
    if (!url || !selector) {
      return res.status(400).json({
        success: false,
        message: 'Both URL and selector are required'
      });
    }

    await selectorCache.set(url, selector, metadata);
    const domain = selectorCache.getDomain(url);

    res.json({
      success: true,
      message: 'Selector cached successfully',
      domain,
      selector,
      metadata
    });

  } catch (error) {
    console.error('Save to cache error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.clearCache = async (req, res) => {
  try {
    await selectorCache.clear();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
