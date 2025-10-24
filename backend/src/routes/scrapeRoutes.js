const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');
const analyzeController = require('../controllers/analyzeController');

router.post('/analyze', analyzeController.analyzeStructure);
router.post('/extract-links', analyzeController.extractLinks);
router.post('/test-selector', analyzeController.testSelector);
router.post('/scrape-article', analyzeController.scrapeSingleArticle);

router.get('/cache', analyzeController.getCache);
router.get('/cache/domain', analyzeController.getCacheByDomain);
router.post('/cache', analyzeController.saveToCache);
router.delete('/cache', analyzeController.clearCache);

router.post('/scrape', scrapeController.scrapeAndSave);
router.get('/search', scrapeController.search);
router.get('/indices', scrapeController.listIndices);

module.exports = router;
