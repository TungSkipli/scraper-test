const axios = require('axios');
const cheerio = require('cheerio');
const { extract } = require('@extractus/article-extractor');

class UniversalScraper {
  constructor() {
    this.timeout = 10000;
    this.maxRetries = 3;
  }

  async fetchWithRetry(url, retries = 0) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.data;
    } catch (error) {
      if (retries < this.maxRetries) {
        console.log(`Retry ${retries + 1}/${this.maxRetries} for ${url}`);
        await this.delay(1000 * (retries + 1));
        return this.fetchWithRetry(url, retries + 1);
      }
      console.error(`Failed to fetch ${url} after ${this.maxRetries} retries`);
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  //tìm tất cả các link bài báo trên trang
  async scrapeListPage(url) {
    const html = await this.fetchWithRetry(url);
    if (!html) return [];

  // Sử dụng cheerio để parse HTML
    const $ = cheerio.load(html);
    const articleLinks = new Set();
    const baseUrl = new URL(url);

    $('a[href]').each((i, elem) => {
      const $elem = $(elem);
      const $parent = $elem.closest('article, .item-news, .item-news-common, .box-category-item, .story, .news-item, .post');
      
      if ($parent.length === 0) return;
      if ($parent.find('.ic-video').length > 0) return;
      if ($parent.hasClass('banner') || $parent.hasClass('ads')) return;
      
      let link = $elem.attr('href');
      if (!link) return;
      
      if (link.includes('/video') || link.includes('/tv.html') || link.includes('#')) return;
      
      if (!link.startsWith('http')) {
        link = baseUrl.origin + (link.startsWith('/') ? '' : '/') + link;
      }
      
      if (link.includes(baseUrl.hostname) && link !== url) {
        articleLinks.add(link);
      }
    });

    return Array.from(articleLinks);
  }

  //trích xuất nội dung với mỗi link bài báo
  async scrapeArticle(url) {
    try {
      const article = await extract(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!article || !article.title) {
        console.log(`No article data extracted from ${url}`);
        return null;
      }

      const hostname = new URL(url).hostname;
      const slug = this.generateSlug(url);
      const category = this.extractCategory(url);
      const tags = this.extractTags(article);

      return {
        title: article.title,
        summary: article.description || '',
        content: article.content || '',
        authors: article.author || 'Unknown',
        category_slug: category,
        slug: slug,
        external_source: url,
        image: {
          url: article.image || '',
          caption: ''
        },
        tags: tags,
        likes: 0,
        state: 'global',
        created_at: article.published ? new Date(article.published).getTime() : Date.now(),
        source_domain: hostname
      };
    } catch (error) {
      console.error(`Failed to extract article from ${url}:`, error.message);
      return null;
    }
  }

  // xác định category từ URL
  extractCategory(url) {
    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
    return pathParts[0] || 'general';
  }

  generateSlug(url) {
    const hostname = new URL(url).hostname;
    const urlPath = url.split('/').pop();
    const path = urlPath.replace('.html', '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    return `${hostname.replace(/\./g, '-')}-${path}-${Date.now()}`;
  }
  //Lấy tags từ nội dung bài báo
  extractTags(article) {
    if (article.tags && Array.isArray(article.tags)) {
      return article.tags;
    }
    if (article.keywords) {
      return article.keywords.split(',').map(k => k.trim()).filter(Boolean);
    }
    return [];
  }

  async scrapeAll(url, limit = 5) {
    console.log(`Starting scrape from: ${url}`);
    const links = await this.scrapeListPage(url);
    console.log(`Found ${links.length} articles`);

    // Limit number of links to process to avoid over-scraping
    const limitedLinks = Array.isArray(links) ? links.slice(0, limit) : [];
    console.log(`Processing ${limitedLinks.length} articles (limit: ${limit})`);

    const articles = [];
    for (const link of limitedLinks) {
      console.log(`Scraping: ${link}`);
      const article = await this.scrapeArticle(link);
      if (article && article.title) {
        articles.push(article);
      }
      await this.delay(500);
    }

    return articles;
  }
}

module.exports = UniversalScraper;
