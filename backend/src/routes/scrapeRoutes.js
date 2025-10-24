const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

router.post('/scrape', scrapeController.scrapeAndSave);
router.get('/search', scrapeController.search);
router.get('/indices', scrapeController.listIndices);

module.exports = router;
