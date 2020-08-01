'use strict';

const cheerio = require('cheerio');

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { extractKsplayer, getHeaders, formatQualities } = require('../utils');

/** The url to make search queries to */
const SEARCH_URL = 'https://animeidhentai.com/search/';
/** The api url that returns the actual stream page */
const API_URL = 'https://animeidhentai.com/wp-admin/admin-ajax.php';

/** Regular expression for matching url for search result or episode */
const URL_REG = /<a href="([^"]+)/;
/** Regular expression for matching the stream provider */
const DATA_ID_REG = /player" data-id="([^"]+)/;
/** Regular expression to extract stream url from provider */
const SRC_REG = /src="([^"]+)/;

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://animeidhentai.com/' });

/**
 * Collects the search results from animeidhentai
 *
 * @param {CheerioStatic} $
 * @returns {SearchResult[]}
 */
function collectSearchResults($) {
    // animeidhentai does not represent a search result as simply
    // the title but it shows the episodes instead
    let searchResults = [];
    $('.movies-lst .hentai').each(function (ind, element) {
        const title = $(this).find('h2').text();
        const poster = $(this).find('img').attr('src');
        // Simply doing $(this).find('a') isn't working for some reason
        const [, url] = $(this).html().match(URL_REG);
        const searchResult = new SearchResult(title, url, poster);
        searchResults.push(searchResult);
    });

    return searchResults;
}

/**
 * Executes a search query on animeidhentai
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>} List of search resuts
 */
async function search(query) {
    // query has to be separated by + and lowercase
    query = query.replace(' ', '+').toLowerCase();
    const search = `${SEARCH_URL}${query}`;
    const response = await request.get(search, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(response);
    const searchResults = collectSearchResults($);
    return searchResults;
}

/**
 * Collects the episodes from animeidhentai
 *
 * @param {CheerioStatic} $
 * @returns {Episode[]} List of episodes
 */
function collectEpisodes($) {
    let episodes = [];
    $('.hentai').each(function (ind, element) {
        const title = $(this).find('h2').text();
        const [, url] = $(this).html().match(URL_REG);
        const episode = new Episode(title, url);
        episodes.push(episode);
    });
    return episodes.reverse();
}

/**
 * Extracts the title and the episodes of the hentai on animeidhentai
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    let page, $;
    if (!url.startsWith('https://animeidhentai.com/hentai/')) {
        // In the scenario that we are not on the actual episodes page
        // find actual episodes page url
        page = await request.get(url, { headers: DEFAULT_HEADERS });
        $ = cheerio.load(page);
        url = $('.entry-footer').find('a').last().attr('href');
    }
    page = await request.get(url, { headers: DEFAULT_HEADERS });
    $ = cheerio.load(page);
    const title = $('.entry-title')
        .first()
        .text()
        .replace(/ Episode \d{1,3}\s?/, ' ')
        .replace('-', '')
        .trim();
    const episodes = collectEpisodes($);
    const anime = new Anime(title, episodes);
    return anime;
}

/**
 * Gets the available subtitle types
 *
 * @param {CheerioStatic} $
 * @param {Map<String, String>} idToStream
 * @returns {Map<String, String>}
 */
function collectSubTypes($, idToStream) {
    // Creates a mapping of a subtitle type to its relevant stream id
    // animeidhentai provides different ids for videos that have subtitles
    // or not
    let subTypes = new Map();
    $('.opt-player button').each(function (ind, element) {
        const streamID = $(this).attr('data-opt');
        const subType = idToStream.get(streamID);
        subTypes.set(subType, streamID);
    });
    return subTypes;
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from animeidhentai
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const [, id] = page.match(DATA_ID_REG);
    // animeidhentai has more than one subtitle type but sub-2 usually is the one
    // that will be prioritized
    const idToStream = new Map([
        ['0', 'sub'],
        ['1', 'sub-2'],
        ['2', 'nosub'],
    ]);
    const $ = cheerio.load(page);
    const subTypes = collectSubTypes($, idToStream);

    // in some situations the video may not have sub-2 but only sub
    // so choose sub just as a fallback
    const subType = subTypes.get('sub-2') || subTypes.get('sub');
    const formData = { id, action: 'ajax_player', opt: subType };
    const streamPage = await request.post(API_URL, {
        headers: getHeaders({ Referer: url }),
        formData: formData,
    });

    let [, streamURL] = streamPage.match(SRC_REG);
    streamURL = streamURL.replace('embed', 'download');
    let qualities = await extractKsplayer(streamURL);
    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: streamURL,
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
