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
    formatQualities
} = require('../utils');

const SEARCH_URL = 'https://hentaihaven.xxx/';
const API_URL = 'https://hentaihaven.xxx/wp-admin/admin-ajax.php';

const PLAYER_SRC_REG = /iframe src="([^"]+)/;
const VIDEO_DATA_REG = /\$\.ajax\((\{.*\})/;
const FORM_VALS_REG = /action:'(.*)',a:'(.*)',b:'(.*)'/;
const SOURCES_REG = /(\{.*\})/;

const DEFAULT_HEADERS = getHeaders({ 'Referer': 'https://hentaihaven.xxx/hentai/' });

function collectSearchResults($) {
    let searchResults = [];
    $('.c-tabs-item__content').each(function (ind, element) {
        const title = $(this).find('h3 a').first().text();
        const url = $(this).find('h3 a').first().attr('href');
        const poster = $(this).find('img').attr('src');
        const searchResult = new SearchResult(title, url, poster)
        searchResults.push(searchResult);
    });
    return searchResults;
}

async function search(query) {
    const params = { s: query, post_type: 'wp-manga' };
    const searchResponse = await cloudscraper.get(SEARCH_URL, {
        headers: DEFAULT_HEADERS,
        qs: params
    });
    const $ = cheerio.load(searchResponse);
    let searchResults = collectSearchResults($);
    return searchResults;
}

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

async function getAnime(url) {
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('h1').text().trim();
    const episodes = collectEpisodes($, title);
    const anime = new Anime(title, episodes);
    return anime;
}

async function getQualities(url) {
    let qualities = new Map();
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    const [, playerSrc] = page.match(PLAYER_SRC_REG);

    const playerPage = await cloudscraper.get(playerSrc, { headers: DEFAULT_HEADERS });
    let [, videoData] = playerPage.match(VIDEO_DATA_REG);
    const [, action, a, b] = videoData.match(FORM_VALS_REG);
    const formData = { action, a, b };

    let sourceData = await cloudscraper.post(API_URL, {
        headers: getHeaders({ 'Referer': playerSrc }),
        formData: formData
    });

    const sources = JSON.parse(sourceData.match(SOURCES_REG)[1]).sources;
    for (const source of sources) {
        qualities.set(source.label, source.src);
    }

    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: API_URL
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities
}
