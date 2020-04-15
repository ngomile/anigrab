'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const {
    getHeaders,
    extractVidstream,
    formatQualities
} = require('../utils');

const SEARCH_URL = 'https://animekisa.tv/search';
const SITE_URL = 'https://animekisa.tv';

const SOURCES_REG = new Map([
    ['vidstream', /var VidStreaming = "([^"]+)/],
    ['mp4upload', /var MP4Upload = "([^"]+)/]
]);

const DEFAULT_HEADERS = getHeaders({ 'Referer': 'https://animekisa.tv' });

function collectSearchResults($) {
    let searchResults = [];
    $('.lisbox22 a.an').each(function (ind, element) {
        const title = $(this).find('.similardd').text();
        const url = `${SITE_URL}${$(this).attr('href')}`;
        const poster = `${SITE_URL}${$(this).find('img').attr('src')}`;
        // Avoid putting garbage result into search results
        if (url === SITE_URL + '/') return;
        searchResults.push({ title, url, poster });
    });
    return searchResults;
}

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

function collectEpisodes($, title) {
    let episodes = [];
    $('a.infovan').each(function (ind, element) {
        const episodeNum = $(this).find('.infoept2 .centerv').text();
        const episodeTitle = `${title} Episode ${episodeNum}`;
        const url = `${SITE_URL}/${$(this).attr('href')}`;
        episodes.push({ title: episodeTitle, url });
    });
    return episodes;
}

async function getAnime(url) {
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('h1.infodes').first().text();
    let episodes = collectEpisodes($, title);
    return episodes.reverse();
}

async function getQualities(url) {
    let qualities = new Map(), extractor;
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    let match = page.match(SOURCES_REG.get('vidstream'));
    if (!match) {
        let [, source] = page.match(SOURCES_REG.get('mp4upload'));
        extractor = 'mp4upload';
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
