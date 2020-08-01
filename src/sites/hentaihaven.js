'use strict';

const cheerio = require('cheerio');

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { getHeaders, formatQualities } = require('../utils');

/** The url to make search queries to */
const SEARCH_URL = 'https://hentaihaven.xxx/';
/** The url to make api calls to */
const API_URL = 'https://hentaihaven.xxx/wp-admin/admin-ajax.php';

/** Regular expression to extract player source  */
const PLAYER_SRC_REG = /iframe src="([^"]+)/;
/** Regular expression to extract json part of video data  */
const VIDEO_DATA_REG = /\$\.ajax\((\{.*\})/;
/** Regular expression to match the form parts necessary to get real source */
const FORM_VALS_REG = /action:'(.*)',a:'(.*)',b:'(.*)'/;
/** Regular expression to extract json of source */
const SOURCES_REG = /(\{.*\})/;

const DEFAULT_HEADERS = getHeaders({
    Referer: 'https://hentaihaven.xxx/hentai/',
});

/**
 * Collects search results
 *
 * @param {CheerioStatic} $
 * @returns {SearchResult[]}
 */
function collectSearchResults($) {
    let searchResults = [];
    $('.c-tabs-item__content').each(function (ind, element) {
        const title = $(this).find('h3 a').first().text();
        const url = $(this).find('h3 a').first().attr('href');
        const poster = $(this).find('img').attr('src');
        const searchResult = new SearchResult(title, url, poster);
        searchResults.push(searchResult);
    });
    return searchResults;
}

/**
 * Executes search query for hentaihaven
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    const params = { s: query, post_type: 'wp-manga' };
    const searchResponse = await request.get(SEARCH_URL, {
        headers: DEFAULT_HEADERS,
        qs: params,
    });
    const $ = cheerio.load(searchResponse);
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
    $('.wp-manga-chapter').each(function (ind, element) {
        const episodeNum = $(this).find('a').text().trim();
        const url = $(this).find('a').attr('href');
        const episode = new Episode(`${title} - ${episodeNum}`, url);
        episodes.push(episode);
    });
    return episodes;
}

/**
 * Extracts the title and episodes from hentaihaven
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('h1').text().trim();
    const episodes = collectEpisodes($, title);
    const anime = new Anime(title, episodes);
    return anime;
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from hentaihaven
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    let qualities = new Map();
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const [, playerSrc] = page.match(PLAYER_SRC_REG);

    const playerPage = await request.get(playerSrc, {
        headers: DEFAULT_HEADERS,
    });
    let [, videoData] = playerPage.match(VIDEO_DATA_REG);
    const [, action, a, b] = videoData.match(FORM_VALS_REG);
    const formData = { action, a, b };

    let sourceData = await request.post(API_URL, {
        headers: getHeaders({ Referer: playerSrc }),
        formData: formData,
    });

    const { sources } = JSON.parse(sourceData.match(SOURCES_REG)[1]);
    for (const source of sources) {
        qualities.set(source.label, source.src);
    }

    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: API_URL,
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
