const { algoliasearch } = require('algoliasearch');

class AlgoliaService {
  constructor() {
    if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_ADMIN_KEY) {
      console.warn('Algolia credentials not found. Algolia indexing disabled.');
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.client = algoliasearch(
      process.env.ALGOLIA_APP_ID,
      process.env.ALGOLIA_ADMIN_KEY
    );
    this.indexName = process.env.ALGOLIA_INDEX_NAME;
  }

  async indexArticles(articles) {
    if (!this.enabled) {
      console.log('Algolia indexing skipped (not configured)');
      return;
    }

    const objects = articles.map(article => ({
      objectID: article.slug,
      ...article
    }));

    try {
      const result = await this.client.saveObjects({
        indexName: this.indexName,
        objects: objects
      });
      console.log(`Indexed ${objects.length} articles to Algolia`);
      return result;
    } catch (error) {
      console.error('Algolia indexing error:', error);
      throw error;
    }
  }

  async searchArticles(query, options = {}) {
    if (!this.enabled) {
      throw new Error('Algolia not configured');
    }

    try {
      const result = await this.client.search({
        requests: [
          {
            indexName: this.indexName,
            query: query,
            ...options
          }
        ]
      });
      return result.results[0].hits;
    } catch (error) {
      console.error('Algolia search error:', error);
      throw error;
    }
  }

  async deleteArticle(slug) {
    if (!this.enabled) return;

    try {
      await this.client.deleteObject({
        indexName: this.indexName,
        objectID: slug
      });
      console.log(`Deleted article ${slug} from Algolia`);
    } catch (error) {
      console.error('Algolia delete error:', error);
    }
  }

  async listIndices() {
    if (!this.enabled) {
      throw new Error('Algolia not configured');
    }

    try {
      const result = await this.client.listIndices();
      return result.items;
    } catch (error) {
      console.error('Algolia list indices error:', error);
      throw error;
    }
  }
}

module.exports = AlgoliaService;
