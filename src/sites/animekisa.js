'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const {
    SearchResult,
    Anime,
    Episode
} = require('./common');

const {
    getHeaders,
    extractVidstream,
    formatQualities
} = require('../utils');

/** The url to perform search queries on */
const SEARCH_URL = 'https://animekisa.tv/search';
/** The url of the site */
const SITE_URL = 'https://animekisa.tv';

/** A mapping of sources to regular expressions to match sources to  */
const SOURCES_REG = new Map([
    ['vidstream', /var VidStreaming = "([^"]+)/],
    ['mp4upload', /var MP4Upload = "([^"]+)/]
]);

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://animekisa.tv' });

/**
 * Collects the search results from animekisa
 * 
 * @param {CheerioStatic} $ 
 * @returns {SearchResult[]}
 */
function collectSearchResults($) {
    let searchResults = [];
    $('.lisbox22 a.an').each(function (ind, element) {
        const title = $(this).find('.similardd').text();
        const url = `${SITE_URL}${$(this).attr('href')}`;
        const poster = `${SITE_URL}${$(this).find('img').attr('src')}`;
        // Avoid putting garbage result into search results
        if (url === SITE_URL + '/') return;
        const searchResult = new SearchResult(title, url, poster);
        searchResults.push(searchResult);
    });
    return searchResults;
}

/**
 * Executes search query on animekisa
 * 
 * @param {string} query 
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    const params = { q: query };
    const searchPage = await cloudscraper.get(SEARCH_URL, {
        headers: DEFAULT_HEADERS,
        qs: params
    });
    const $ = cheerio.load(searchPage);
    let searchResults = collectSearchResults($);
    return searchResults;
}

/**
 * Collects the episodes of the anime
 * 
 * @param {CheerioStatic} $ 
 * @param {string} title 
 */
function collectEpisodes($, title) {
    let episodes = [];
    $('a.infovan').each(function (ind, element) {
        const episodeNum = $(this).find('.infoept2 .centerv').text();
        // animekisa does not list episodes with correct title
        // this ensures it is the correct title
        const episodeTitle = `${title} Episode ${episodeNum}`;
        const url = `${SITE_URL}/${$(this).attr('href')}`;
        const episode = new Episode(episodeTitle, url);
        episodes.push(episode);
    });
    return episodes.reverse();
}

/**
 * Extracts the title and the episodes of the anime from animekisa
 * 
 * @param {string} url 
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('h1.infodes').text();
    const episodes = collectEpisodes($, title);
    const anime = new Anime(title, episodes);
    return anime;
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from animekisa
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    let qualities = new Map(), extractor;
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    // try to get from vidstream by default, this should be user configurable
    let match = page.match(SOURCES_REG.get('vidstream'));
    if (!match) {
        let [, source] = page.match(SOURCES_REG.get('mp4upload'));
        extractor = 'mp4upload';
        // Can't tell what quality mp4upload will have so set to unknown
        qualities.set('unknown', source);
    } else {
        let [, source] = match;
        extractor = 'universal';
        qualities = await extractVidstream(source, url);
    }

    qualities = formatQualities(qualities, {
        extractor,
        referer: url
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities
}
