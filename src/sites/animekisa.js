'use strict';

const cheerio = require('cheerio');

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { getHeaders, extractQualities, formatQualities } = require('../utils');

const config = require('../config').getConfig().siteconfig.animekisa;

/** The url to perform search queries on */
const SEARCH_URL = 'https://animekisa.tv/search';
/** The url of the site */
const SITE_URL = 'https://animekisa.tv';

/** A mapping of sources to regular expressions to match sources to  */
const SOURCES_REG = new Map([
    ['gcloud', /var Fembed = "([^"]+)/],
    ['vidstream', /var VidStreaming = "([^"]+)/],
    ['mp4upload', /var MP4Upload = "([^"]+)/],
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
        // Avoid putting garbage result in search results
        if (url === `${SITE_URL}/`) return;
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
    const searchPage = await request.get(
        SEARCH_URL,
        {
            headers: DEFAULT_HEADERS,
            qs: params,
        },
        true
    );
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
    const page = await request.get(url, { headers: DEFAULT_HEADERS }, true);
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
    const { server, fallbackServers } = config;
    const page = await request.get(url, { headers: DEFAULT_HEADERS }, true);
    const info = { page, server, sourcesReg: SOURCES_REG, url };

    let { qualities, extractor } = await extractQualities(info);
    for (const fallbackServer of fallbackServers) {
        if (qualities.size) break;
        ({ qualities, extractor } = await extractQualities({
            ...info,
            server: fallbackServer,
        }));
    }

    qualities = formatQualities(qualities, {
        extractor,
        referer: url,
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
