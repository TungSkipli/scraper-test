const UniversalScraper = require('../services/universalScraper');
const AlgoliaService = require('../services/algoliaService');
const { db } = require('../config/firebase');

const algolia = new AlgoliaService();

exports.scrapeAndSave = async (req, res) => {
  try {
    const { url, usePuppeteer = 'auto' } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required in request body'
      });
    }

    console.log('Starting scrape process...');
    console.log('Mode:', usePuppeteer);
    
    const scraper = new UniversalScraper({ usePuppeteer });
    const articles = await scraper.scrapeAll(url);
    
    if (articles.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No articles scraped',
        count: 0
      });
    }

    console.log(`Saving ${articles.length} articles to Firestore...`);
    
    const batch = db.batch();
    const hostname = new URL(url).hostname.replace(/\./g, '_');
    const collectionRef = db.collection('news').doc('articles').collection(hostname);
    
    articles.forEach(article => {
      const docRef = collectionRef.doc(article.slug);
      batch.set(docRef, article);
    });

    await batch.commit();
    console.log('Articles saved to Firestore');

    if (algolia.enabled) {
      try {
        await algolia.indexArticles(articles);
      } catch (error) {
        console.error('Algolia indexing failed:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Scraping completed',
      count: articles.length,
      collection: `news/articles/${hostname}`,
      articles: articles.map(a => ({ 
        title: a.title, 
        slug: a.slug,
        url: a.external_source 
      }))
    });

  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.search = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required'
      });
    }

    const results = await algolia.searchArticles(q, { hitsPerPage: parseInt(limit) });

    res.json({
      success: true,
      query: q,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.listIndices = async (req, res) => {
  try {
    const indices = await algolia.listIndices();

    res.json({
      success: true,
      count: indices.length,
      indices: indices.map(idx => ({
        name: idx.name,
        entries: idx.entries,
        updatedAt: idx.updatedAt
      }))
    });

  } catch (error) {
    console.error('List indices error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
