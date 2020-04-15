'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const {
    getHeaders,
    formatQualities,
    extractVidstream
} = require('../utils');

const SITE_URL = 'https://www16.gogoanime.io';
const SEARCH_URL = 'https://ajax.gogocdn.net/site/loadAjaxSearch';
const API_URL = 'https://ajax.gogocdn.net/ajax/load-list-episode';

const ALIAS_REG = /category\/(.*)$/;
const SOURCES_REG = new Map([
    ['vidstream', /href="(https:\/\/vidstreaming.io\/download.*)" target/],
    ['mp4upload', /data-video="(.*)"> Mp4Upload/]
]);

const DEFAULT_HEADERS = getHeaders({ 'Referer': 'https://www16.gogoanime.io/' });

function collectSearchResults($) {
    let searchResults = [];
    $('.list_search_ajax').each(function (ind, element) {
        const title = $(this).find('.ss-title').text();
        const url = $(this).find('.ss-title').attr('href');
        let poster = $(this).find('.thumbnail-recent_search').attr('style');
        [, poster] = poster.match(/"([^"]+)/);
        searchResults.push({ title, url, poster });
    });
    return searchResults;
}

async function search(query) {
    const params = { keyword: query, id: '-1', link_web: 'https://www16.gogoanime.io/' };
    let searchResponse = await cloudscraper.get(SEARCH_URL, {
        headers: DEFAULT_HEADERS,
        qs: params
    });
    searchResponse = JSON.parse(searchResponse).content;
    const $ = cheerio.load(searchResponse);
    let searchResults = collectSearchResults($);
    return searchResults;
}

function collectEpisodes($, animeName) {
    let episodes = [];
    $('#episode_related a').each(function (ind, element) {
        const episodeNum = $(this).find('.name').text().replace('EP ', '');
        const title = `${animeName} Episode ${episodeNum}`.replace('  ', ' ');
        let url = $(this).attr('href').trim();
        url = `${SITE_URL}${url}`;
        episodes.push({ title, url });
    });
    return episodes;
}

async function getAnime(url) {
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    let $ = cheerio.load(page);
    const animeName = $('title').text().replace(' at Gogoanime', '');
    const movieID = $('#movie_id').first().attr('value');
    const [, alias] = url.match(ALIAS_REG);
    const params = { ep_start: 0, ep_end: 9000, id: movieID, default_ep: 0, alias: alias };
    const response = await cloudscraper.get(API_URL, {
        headers: DEFAULT_HEADERS,
        qs: params
    });

    $ = cheerio.load(response);
    let episodes = collectEpisodes($, animeName);
    return episodes.reverse();
}

async function getQualities(url) {
    let qualities = new Map(), extractor = 'universal';
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    let source = page.match(SOURCES_REG.get('vidstream'));

    if (!source) {
        extractor = 'mp4upload';
        [, source] = page.match(SOURCES_REG.get('mp4upload'));
        qualities.set('unknown', source);
    } else {
        [, source] = source;
        qualities = await extractVidstream(source, url);
    };

    qualities = formatQualities(qualities, {
        extractor,
        referer: source
    });

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities
}
