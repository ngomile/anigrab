'use strict';

const cheerio = require('cheerio');

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');

const { getHeaders, formatQualities } = require('../utils');

/** The url to perform search queries on  */
const SEARCH_URL = 'https://www.animeout.xyz/';

/** Regular expression that tries to find what quality the episode is */
const QUALITY_REG = /((?:360|480|720|1080)p)/;
/** Regular expression that matches the actual video url */
const REAL_URL_REG = /var url = "([^"]+)/;
/** Regular expression to match urls that are direct download links */
const DIRECT_DL_REG = /https?:\/\/\w+\.animeout.*?\.mkv$/;

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://animeout.xyz/' });

/**
 * Collects the search results from animeout
 *
 * @param {CheerioStatic} $
 * @returns {SearchResult[]}
 */
function collectSearchResults($) {
    let searchResults = [];
    $('div.post-content').each(function (ind, element) {
        // Poster may not be found sometimes
        const poster = $(this).find('img').attr('src') || 'N/A';
        const title = $(this).find('h3.post-title a').text();
        const url = $(this).find('h3.post-title a').attr('href');
        const searchResult = new SearchResult(title, url, poster);
        searchResults.push(searchResult);
    });
    return searchResults;
}

/**
 * Executes a search query on animeout
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    const params = { s: query, post_type: 'post' };
    const searchText = await request.get(SEARCH_URL, {
        qs: params,
        headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(searchText);
    let searchResults = collectSearchResults($);
    return searchResults;
}

/**
 * Collects episodes from animeout
 *
 * @param {CheerioStatic} $
 * @returns {Episode[]}
 */
function collectEpisodes($) {
    let episodes = [];
    $('article.post a').each(function (ind, element) {
        const url = $(this).attr('href');
        if (!DIRECT_DL_REG.test(url)) return;
        // Title is taken from the direct download link
        const urlParts = url.split('/');
        const title = urlParts[urlParts.length - 1].replace('.mkv', '');
        const episode = new Episode(title, url);
        episodes.push(episode);
    });
    return episodes;
}

/**
 * Extracts the title and episodes from animeout
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('.page-title').text();
    const episodes = collectEpisodes($);
    const anime = new Anime(title, episodes);
    return anime;
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from animeout
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    let qualities = new Map();
    const page = await request.get(url, { headers: DEFAULT_HEADERS });

    let $ = cheerio.load(page);
    let realDLPage = $('a.btn').first().attr('href');
    realDLPage = await request.get(realDLPage, { headers: DEFAULT_HEADERS });

    // Try to find the quality for the episode otherwise unknown quality
    let quality = QUALITY_REG.exec(realDLPage);
    if (quality) [, quality] = quality;
    else quality = 'unknown';

    const [, realURL] = REAL_URL_REG.exec(realDLPage);
    qualities.set(quality, realURL);
    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: realURL,
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
