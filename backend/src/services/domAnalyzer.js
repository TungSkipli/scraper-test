class DOMAnalyzer {
  constructor() {
    this.articleIndicators = [
      'article', 'news', 'post', 'story', 'item', 'entry', 
      'blog', 'content', 'card', 'box', 'list'
    ];
    
    this.commonContainerTags = [
      'article', 'div', 'section', 'li', 'aside'
    ];
  }

  async analyzePageStructure(page) {
    console.log('[DOMAnalyzer] Analyzing page structure...');
    
    const analysis = await page.evaluate((articleIndicators, commonContainerTags) => {
      const results = {
        linkContainers: [],
        detectedSelectors: [],
        linkStats: { total: 0, withText: 0, withImages: 0 }
      };

      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      results.linkStats.total = allLinks.length;

      const containerMap = new Map();

      const getElementIdentifier = (elem) => {
        if (elem.id) return `#${elem.id}`;
        if (elem.className) {
          const firstClass = elem.className.split(' ')[0];
          return `${elem.tagName.toLowerCase()}.${firstClass}`;
        }
        return elem.tagName.toLowerCase();
      };

      allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.includes('javascript:')) return;
        
        if (link.innerText && link.innerText.length > 10) {
          results.linkStats.withText++;
        }
        if (link.querySelector('img')) {
          results.linkStats.withImages++;
        }

        let parent = link.parentElement;
        let depth = 0;
        
        while (parent && depth < 5) {
          if (commonContainerTags.includes(parent.tagName.toLowerCase())) {
            const containerKey = getElementIdentifier(parent);
            
            if (!containerMap.has(containerKey)) {
              containerMap.set(containerKey, {
                element: parent,
                tagName: parent.tagName.toLowerCase(),
                className: parent.className,
                id: parent.id,
                linkCount: 0,
                score: 0,
                selector: containerKey
              });
            }
            
            const container = containerMap.get(containerKey);
            container.linkCount++;
            
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
      });

      containerMap.forEach((container, key) => {
        const elem = container.element;
        let score = container.linkCount * 10;

        const text = elem.className.toLowerCase() + ' ' + elem.id.toLowerCase();
        articleIndicators.forEach(indicator => {
          if (text.includes(indicator)) {
            score += 50;
          }
        });

        if (elem.querySelector('img')) score += 20;
        if (elem.querySelector('time, .date, .time')) score += 30;
        if (elem.querySelector('h1, h2, h3, h4')) score += 40;

        const textContent = elem.innerText || '';
        if (textContent.length > 50 && textContent.length < 500) {
          score += 25;
        }

        container.score = score;
        
        if (score > 50) {
          results.linkContainers.push(container);
        }
      });

      results.linkContainers.sort((a, b) => b.score - a.score);

      const topContainers = results.linkContainers.slice(0, 10);
      const selectorCandidates = new Set();

      topContainers.forEach(container => {
        if (container.className) {
          const classes = container.className.split(' ').filter(c => c.length > 0);
          classes.forEach(cls => {
            selectorCandidates.add(`.${cls}`);
          });
        }
        
        if (container.id) {
          selectorCandidates.add(`#${container.id}`);
        }
        
        selectorCandidates.add(container.tagName);
        
        if (container.className) {
          const firstClass = container.className.split(' ')[0];
          if (firstClass) {
            selectorCandidates.add(`${container.tagName}.${firstClass}`);
          }
        }
      });

      results.detectedSelectors = Array.from(selectorCandidates);

      return results;
    }, this.articleIndicators, this.commonContainerTags);

    console.log(`[DOMAnalyzer] Found ${analysis.linkContainers.length} potential article containers`);
    console.log(`[DOMAnalyzer] Link stats:`, analysis.linkStats);
    
    return analysis;
  }

  generateOptimalSelector(analysis) {
    if (analysis.linkContainers.length === 0) {
      return this.getFallbackSelectors();
    }

    const topContainers = analysis.linkContainers.slice(0, 5);
    const selectors = [];

    topContainers.forEach(container => {
      if (container.className) {
        const classes = container.className.split(' ').filter(c => c.length > 2);
        if (classes.length > 0) {
          selectors.push(`.${classes[0]}`);
        }
      }
      
      if (container.tagName === 'article') {
        selectors.push('article');
      }
    });

    const uniqueSelectors = [...new Set(selectors)];
    const finalSelector = uniqueSelectors.join(', ');

    console.log(`[DOMAnalyzer] Generated selector: ${finalSelector}`);
    
    return finalSelector || this.getFallbackSelectors();
  }

  getFallbackSelectors() {
    return 'article, .item-news, .item-news-common, .box-category-item, .story, .news-item, .post, .article-item, .news-box, .entry, .content-item';
  }

  async testSelector(page, selector) {
    const count = await page.evaluate((sel) => {
      try {
        return document.querySelectorAll(sel).length;
      } catch (e) {
        return 0;
      }
    }, selector);

    console.log(`[DOMAnalyzer] Selector "${selector}" matches ${count} elements`);
    return count;
  }

  async extractLinksWithSelector(page, selector, baseUrl) {
    const links = await page.evaluate((sel, base) => {
      const articleLinks = new Set();
      const baseUrlObj = new URL(base);
      
      try {
        const containers = document.querySelectorAll(sel);
        
        containers.forEach(container => {
          if (container.querySelector('.ic-video, .video-icon')) return;
          if (container.classList.contains('banner') || container.classList.contains('ads')) return;
          
          const linkElements = container.querySelectorAll('a[href]');
          
          linkElements.forEach(linkElem => {
            let href = linkElem.getAttribute('href');
            if (!href) return;
            
            if (href.includes('/video') || href.includes('/tv.html') || 
                href.includes('#') || href.includes('javascript:')) return;
            
            if (!href.startsWith('http')) {
              href = baseUrlObj.origin + (href.startsWith('/') ? '' : '/') + href;
            }
            
            if (href.includes(baseUrlObj.hostname) && href !== base) {
              articleLinks.add(href);
            }
          });
        });
      } catch (e) {
        console.error('Error extracting links:', e.message);
      }
      
      return Array.from(articleLinks);
    }, selector, baseUrl);

    return links;
  }
}

module.exports = DOMAnalyzer;
