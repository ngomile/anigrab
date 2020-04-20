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

const SEARCH_URL = 'https://www.animeout.xyz/';

const QUALITY_REG = /((?:360|480|720|1080)p)/;
const REAL_URL_REG = /var url = "([^"]+)/;
const DIRECT_DL_REG = /https?:\/\/\w+\.animeout.*?\.mkv/;

const DEFAULT_HEADERS = getHeaders({ 'Referer': 'https://animeout.xyz/' });

function collectSearchResults($) {
    let searchResults = [];
    $('div.post-content').each(function (ind, element) {
        const poster = $(this).find('img').attr('src') || 'N/A';
        const title = $(this).find('h3.post-title a').text();
        const url = $(this).find('h3.post-title a').attr('href');
        const searchResult = new SearchResult(title, url, poster);
        searchResults.push(searchResult);
    });
    return searchResults;
}

async function search(query) {
    const params = { 's': query, 'post_type': 'post' };
    const searchText = await cloudscraper.get(SEARCH_URL, {
        qs: params,
        headers: DEFAULT_HEADERS
    });
    const $ = cheerio.load(searchText);
    let searchResults = collectSearchResults($);
    return searchResults;
}

function collectEpisodes($) {
    let episodes = [];
    $('article.post a').each(function (ind, element) {
        const url = $(this).attr('href');
        if (!DIRECT_DL_REG.test(url)) return;
        const urlParts = url.split('/');
        const title = urlParts[urlParts.length - 1].replace('.mkv', '');
        const episode = new Episode(title, url);
        episodes.push(episode);
    });
    return episodes;
}

async function getAnime(url) {
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('.page-title').text();
    const episodes = collectEpisodes($);
    const anime = new Anime(title, episodes);
    return anime;
}

async function getQualities(url) {
    let qualities = new Map();
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });

    let $ = cheerio.load(page);
    let realDLPage = $('a.btn').first().attr('href');
    realDLPage = await cloudscraper.get(realDLPage, { headers: DEFAULT_HEADERS });

    let quality = QUALITY_REG.exec(realDLPage);
    if (quality) {
        [, quality] = quality;
    }
    else {
        quality = 'unknown';
    }

    const [, realURL] = REAL_URL_REG.exec(realDLPage);
    qualities.set(quality, realURL);
    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: realURL
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities
};
