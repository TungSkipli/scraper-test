const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class PuppeteerScraper {
  constructor() {
    this.browser = null;
    this.timeout = 30000;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeListPage(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.timeout 
      });
      
      await this.delay(2000);
      
      const html = await page.content();
      const $ = cheerio.load(html);
      const articleLinks = new Set();
      const baseUrl = new URL(url);

      $('a[href]').each((i, elem) => {
        const $elem = $(elem);
        const $parent = $elem.closest('article, .item-news, .item-news-common, .box-category-item, .story, .news-item, .post, .article-item, .news-box, .entry, .content-item');
        
        if ($parent.length === 0) return;
        if ($parent.find('.ic-video').length > 0) return;
        if ($parent.hasClass('banner') || $parent.hasClass('ads')) return;
        
        let link = $elem.attr('href');
        if (!link) return;
        
        if (link.includes('/video') || link.includes('/tv.html') || link.includes('#') || link.includes('javascript:')) return;
        
        if (!link.startsWith('http')) {
          link = baseUrl.origin + (link.startsWith('/') ? '' : '/') + link;
        }
        
        if (link.includes(baseUrl.hostname) && link !== url) {
          articleLinks.add(link);
        }
      });

      await page.close();
      return Array.from(articleLinks);
    } catch (error) {
      console.error(`Puppeteer scrapeListPage error for ${url}:`, error.message);
      await page.close();
      return [];
    }
  }

  async scrapeArticle(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.timeout 
      });
      
      await this.delay(1000);
      
      const articleData = await page.evaluate(() => {
        const getMetaContent = (name) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta ? meta.content : '';
        };

        const getJsonLd = () => {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent);
              if (data['@type'] === 'NewsArticle' || data['@type'] === 'Article') {
                return data;
              }
            } catch (e) {}
          }
          return null;
        };

        const jsonLd = getJsonLd();
        
        const title = document.querySelector('h1')?.innerText || 
                     document.querySelector('.title-detail')?.innerText ||
                     document.querySelector('.article-title')?.innerText ||
                     getMetaContent('og:title') ||
                     document.title;

        const summarySelectors = [
          '.description', '.sapo', '.summary', '.excerpt', 
          '.lead', '.intro', 'h2.description', '.article-sapo'
        ];
        let summary = getMetaContent('description') || getMetaContent('og:description');
        if (!summary) {
          for (const selector of summarySelectors) {
            const elem = document.querySelector(selector);
            if (elem && elem.innerText) {
              summary = elem.innerText;
              break;
            }
          }
        }

        const contentSelectors = [
          'article', '.content-detail', '.article-content', 
          '.fck_detail', '.detail-content', '.entry-content',
          '.post-content', '.article-body', '.NewsDetailContent'
        ];
        let content = '';
        for (const selector of contentSelectors) {
          const elem = document.querySelector(selector);
          if (elem) {
            const cloned = elem.cloneNode(true);
            cloned.querySelectorAll('script, style, iframe, .ads, .related, .comment, .social-share').forEach(el => el.remove());
            content = cloned.innerText || cloned.textContent;
            if (content && content.length > 100) break;
          }
        }

        const authorSelectors = [
          '.author', '.author-name', '.article-author', 
          '[rel="author"]', '.meta-author', '.byline'
        ];
        let author = getMetaContent('author') || jsonLd?.author?.name || '';
        if (!author) {
          for (const selector of authorSelectors) {
            const elem = document.querySelector(selector);
            if (elem && elem.innerText) {
              author = elem.innerText.trim();
              break;
            }
          }
        }

        const image = getMetaContent('og:image') || 
                     document.querySelector('article img')?.src ||
                     document.querySelector('.content-detail img')?.src ||
                     jsonLd?.image?.url || jsonLd?.image || '';

        const published = getMetaContent('article:published_time') || 
                         getMetaContent('datePublished') ||
                         jsonLd?.datePublished ||
                         document.querySelector('time')?.getAttribute('datetime') || '';

        const keywordsStr = getMetaContent('keywords') || 
                           getMetaContent('article:tag') ||
                           jsonLd?.keywords || '';

        return {
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          author: author || 'Unknown',
          image: image,
          published: published,
          keywords: keywordsStr
        };
      });

      await page.close();

      if (!articleData.title) {
        console.log(`No title extracted from ${url}`);
        return null;
      }

      const hostname = new URL(url).hostname;
      const slug = this.generateSlug(url);
      const category = this.extractCategory(url);
      const tags = this.extractTags(articleData.keywords);

      return {
        title: articleData.title,
        summary: articleData.summary || '',
        content: articleData.content || '',
        authors: articleData.author || 'Unknown',
        category_slug: category,
        slug: slug,
        external_source: url,
        image: {
          url: articleData.image || '',
          caption: ''
        },
        tags: tags,
        likes: 0,
        state: 'global',
        created_at: articleData.published ? new Date(articleData.published).getTime() : Date.now(),
        source_domain: hostname
      };

    } catch (error) {
      console.error(`Puppeteer scrapeArticle error for ${url}:`, error.message);
      await page.close();
      return null;
    }
  }

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

  extractTags(keywords) {
    if (!keywords) return [];
    return keywords.split(',').map(k => k.trim()).filter(Boolean);
  }

  async scrapeAll(url, limit = 5) {
    console.log(`[Puppeteer] Starting scrape from: ${url} (limit: ${limit})`);
    const links = await this.scrapeListPage(url);
    console.log(`[Puppeteer] Found ${links.length} articles`);

    const articles = [];
    for (const link of links) {
      if (articles.length >= limit) {
        console.log(`[Puppeteer] Reached limit of ${limit} articles`);
        break;
      }
      
      console.log(`[Puppeteer] Scraping: ${link}`);
      const article = await this.scrapeArticle(link);
      if (article && article.title) {
        articles.push(article);
      }
      await this.delay(1000);
    }

    await this.closeBrowser();
    return articles;
  }
}

module.exports = PuppeteerScraper;
