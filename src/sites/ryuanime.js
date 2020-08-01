'use strict';

const cheerio = require('cheerio');

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { getHeaders, formatQualities } = require('../utils');

const config = require('../config').getConfig().siteconfig.ryuanime;

/** The url to make search queries to */
const SEARCH_URL = 'https://www4.ryuanime.com/search';

/** Regular expression to match the sources of the video */
const SOURCES_REG = /episode_videos = (\[.*\])/;

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://www4.ryuanime.com/' });

/**
 * Collects search results of the anime
 *
 * @param {CheerioStatic} $
 * @returns {SearchResult[]}
 */
function collectSearchResults($) {
    let searchResults = [];
    $('.list-inline a').each(function (ind, elemenet) {
        const title = $(this).text();
        const url = $(this).attr('href');
        const searchResult = new SearchResult(title, url);
        searchResults.push(searchResult);
    });
    return searchResults;
}

/**
 * Executes search query on ryuanime
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    const params = { term: query };
    const searchPage = await request.get(SEARCH_URL, {
        qs: params,
        headers: DEFAULT_HEADERS,
    });
    const $ = cheerio.load(searchPage);
    let searchResults = collectSearchResults($);
    return searchResults;
}

/**
 * Collects the episodes of the anime
 *
 * @param {CheerioStatic} $
 * @returns {Episode[]}
 */
function collectEpisodes($) {
    const versionsMap = new Map([
        ['subbed', 'Sub'],
        ['dubbed', 'Dub'],
    ]);
    const version = versionsMap.get(config.version);
    let episodes = [];
    $('.card-body .row a').each(function (ind, element) {
        let title = $(this).text();
        // Only getting subbed, should be user configurable
        if (!title.includes(version)) return;
        let url = $(this).attr('href');
        const episode = new Episode(title, url);
        episodes.push(episode);
    });

    return episodes.reverse();
}

/**
 * Extracts the title and episodes from ryuanime
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('h1').text();
    const episodes = collectEpisodes($);
    const anime = new Anime(title, episodes);
    return anime;
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from ryuanime
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    function handleSources(sources, version, server) {
        let qualities = new Map();
        let extractor = '';
        for (const { id, host, type } of sources) {
            if (host === server && type === version) {
                extractor = host;
                if (host === 'trollvid')
                    qualities.set(
                        'unknown',
                        `https://trollvid.net/embed/${id}`
                    );
                else if (host === 'mp4upload')
                    qualities.set(
                        'unknown',
                        `https://www.mp4upload.com/embed-${id}.html`
                    );
            }
        }
        return { qualities, extractor };
    }
    const { version, server, fallbackServers } = config;
    const episodePage = await request.get(url, { headers: DEFAULT_HEADERS });
    let [, sources] = SOURCES_REG.exec(episodePage);
    sources = JSON.parse(sources);
    let { extractor, qualities } = handleSources(sources, version, server);

    for (const fallbackServer of fallbackServers) {
        if (qualities.size) break;
        ({ extractor, qualities } = handleSources(
            sources,
            version,
            fallbackServer
        ));
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
