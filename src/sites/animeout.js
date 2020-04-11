'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const {
    getHeaders,
    formatQualities
} = require('../utils');

const SEARCH_URL = 'https://www.animeout.xyz/';

const QUALITY_REG = /\b(\d{3,4}p)/;
const REAL_URL_REG = /var url = "([^"]+)/;
const DIRECT_DL_REG = /https?:\/\/\w\w+\.animeout.*?\.mkv/;

const DEFAULT_HEADERS = getHeaders({ 'Referer': 'https://animeout.xyz/' });

async function search(query) {
    let searchResults = [];
    const params = { 's': query, 'post_type': 'post' };
    const searchText = await cloudscraper.get(SEARCH_URL, {
        qs: params,
        headers: DEFAULT_HEADERS
    });

    const $ = cheerio.load(searchText);
    $('div.post-content').each(function (ind, element) {
        const poster = $(this).find('img').attr('src') || 'N/A';
        const title = $(this).find('h3.post-title a').text();
        const url = $(this).find('h3.post-title a').attr('href');
        searchResults.push({ title: title, poster: poster, url: url });
    });
    return searchResults;
}

async function getAnime(url) {
    let episodes = [];
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });

    const $ = cheerio.load(page);
    $('article.post a').each(function (ind, element) {
        const url = $(this).attr('href');
        if (!DIRECT_DL_REG.test(url)) return;
        const urlParts = url.split('/');
        const title = urlParts[urlParts.length - 1].replace('.mkv', '');
        episodes.push({ title: title, url: url });
    });
    return episodes;
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
