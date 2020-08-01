'use strict';

const cheerio = require('cheerio');

const request = require('../request');
const { SearchResult, Episode, Anime } = require('./common');
const { getHeaders, formatQualities } = require('../utils');

/** The url to make search queries to */
const SEARCH_URL = 'https://www.animefreak.tv/search/topSearch';
/** The base url of an anime */
const ANIME_URL = 'https://www.animefreak.tv/watch';

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://www.animefreak.tv/' });

/**
 * Executes search query for animefreak
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    let searchResults = [];
    const params = { q: query };
    const { data } = await request.get(SEARCH_URL, {
        qs: params,
        headers: DEFAULT_HEADERS,
    });
    for (const { name, seo_name } of data) {
        searchResults.push(new SearchResult(name, `${ANIME_URL}/${seo_name}`));
    }

    return searchResults;
}

/**
 * Extracts the title and episodes from animefreak
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    let episodes = [];
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const [, title] = page.match(/Watch (.*?) Anime/);
    const $ = cheerio.load(page);
    $('ul.check-list')
        .last()
        .find('a')
        .each(function (ind, elem) {
            episodes.push(
                new Episode(
                    `${title} ${$(this).text().trim()}`,
                    $(this).attr('href')
                )
            );
        });

    return new Anime(title, episodes.reverse());
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from animefreak
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    let qualities = new Map();
    const [, source] = page.match(/loadVideo[\s\S]+file: "([^"]+)/);
    let quality = source.match(/(\d{3,4}p)/);

    if (quality) {
        [, quality] = quality;
        qualities.set(quality, source);
    } else {
        qualities.set('unknown', source);
    }
    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: url,
    });
    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
