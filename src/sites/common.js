'use strict';

/**
 * Represents a search result, used when scraping
 * search results from site
 */
export class SearchResult {
    /**
     * @param {string} title
     * @param {string} url
     * @param {string} poster
     */
    constructor(title, url, poster = '') {
        this.title = title;
        this.url = url;
        this.poster = poster;
    }

    toString() {
        return this.title;
    }
}

/**
 * Represent an episode, used when scraping the
 * episodes of an anime
 */
export class Episode {
    /**
     * @param {string} title
     * @param {string} url
     * @param {string?} poster
     */
    constructor(title, url, poster = null) {
        this.title = title;
        this.url = url;
        this.poster = poster;
    }

    toString() {
        return this.title;
    }
}

/**
 * Represents an anime with its title and the episodes
 * it has, used when scraping the title and episodes
 */
export class Anime {
    /**
     * @param {string} title
     * @param {Episode[]} episodes
     */
    constructor(title, episodes) {
        this.title = title;
        this.episodes = episodes;
    }

    toString() {
        return this.title;
    }
}
