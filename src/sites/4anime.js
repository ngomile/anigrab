'use strict';

const cheerio = require('cheerio');
const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { getHeaders, formatQualities } = require('../utils');

// 4anime base url
const SITE_URL = 'https://4anime.to/';

// Regular expression to extract source file of episode
const SOURCE_REG = /source src="([^"]+)/;

const DEFAULT_HEADERS = getHeaders({ Referer: SITE_URL });

/**
 * Executes search query for 4anime
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    let searchResults = [];
    query = query.toLowerCase().split(' ').join('+');
    const searchResponse = await request.get(
        SITE_URL,
        { qs: { s: query }, headers: DEFAULT_HEADERS },
        true
    );
    const $ = cheerio.load(searchResponse);

    $('#headerDIV_95').each(function (ind, elem) {
        const title = $(this).find('img+div').text();
        const url = $(this).find('a').attr('href');
        const poster = $(this).find('img').attr('src');
        searchResults.push(new SearchResult(title, url, poster));
    });

    return searchResults;
}

/**
 * Extracts the title and episodes from 4anime
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    let episodes = [];
    const page = await request.get(url, { headers: DEFAULT_HEADERS }, true);
    const $ = cheerio.load(page);
    const animeTitle = $('div').find('p.single-anime-desktop').text();

    $('.single-anime-category a').each(function (ind, elem) {
        const episodeNum = $(this).text();
        const episodeTitle = `${animeTitle} Episode ${episodeNum}`;
        const url = $(this).attr('href');
        episodes.push(new Episode(episodeTitle, url));
    });

    return new Anime(animeTitle, episodes);
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from 4anime
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    let qualities = new Map();
    const page = await request.get(url, { headers: DEFAULT_HEADERS }, true);
    const [, source] = page.match(SOURCE_REG);
    const [, quality] = source.match(/(\d{3,4}p)/);
    qualities.set(quality, source);
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
