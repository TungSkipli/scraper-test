const fs = require('fs').promises;
const path = require('path');

class SelectorCache {
  constructor() {
    this.cache = new Map();
    this.cacheFile = path.join(__dirname, '..', '..', 'selector-cache.json');
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      Object.entries(parsed).forEach(([domain, info]) => {
        this.cache.set(domain, info);
      });
      
      console.log(`[SelectorCache] Loaded ${this.cache.size} domains from cache`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[SelectorCache] Error loading cache:', error.message);
      }
    }
    
    this.loaded = true;
  }

  async save() {
    try {
      const data = Object.fromEntries(this.cache);
      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[SelectorCache] Saved ${this.cache.size} domains to cache`);
    } catch (error) {
      console.error('[SelectorCache] Error saving cache:', error.message);
    }
  }

  getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return null;
    }
  }

  async get(url) {
    await this.load();
    const domain = this.getDomain(url);
    if (!domain) return null;
    
    const cached = this.cache.get(domain);
    if (cached) {
      console.log(`[SelectorCache] Using cached selector for ${domain}`);
      return cached.selector;
    }
    
    return null;
  }

  async set(url, selector, metadata = {}) {
    await this.load();
    const domain = this.getDomain(url);
    if (!domain) return;
    
    this.cache.set(domain, {
      selector,
      lastUsed: new Date().toISOString(),
      successCount: (this.cache.get(domain)?.successCount || 0) + 1,
      ...metadata
    });
    
    console.log(`[SelectorCache] Cached selector for ${domain}`);
    await this.save();
  }

  async clear() {
    this.cache.clear();
    await this.save();
    console.log('[SelectorCache] Cache cleared');
  }

  async getStats() {
    await this.load();
    return {
      totalDomains: this.cache.size,
      domains: Array.from(this.cache.entries()).map(([domain, info]) => ({
        domain,
        selector: info.selector,
        successCount: info.successCount,
        lastUsed: info.lastUsed
      }))
    };
  }
}

module.exports = SelectorCache;
