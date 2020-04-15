'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const {
    getHeaders,
    formatQualities
} = require('../utils');

const SEARCH_URL = 'https://www4.ryuanime.com/search';

const SOURCES_REG = /episode_videos = (\[.*\])/;

const DEFAULT_HEADERS = getHeaders({ 'Referer': 'https://www4.ryuanime.com/' });

function collectSearchResults($) {
    let searchResults = [];
    $('.list-inline a').each(function (ind, elemenet) {
        searchResults.push({
            title: $(this).text(),
            url: $(this).attr('href'),
            poster: 'N/A'
        });
    });
    return searchResults;
}

async function search(query) {
    const params = { term: query };
    const searchPage = await cloudscraper.get(SEARCH_URL, { qs: params, headers: DEFAULT_HEADERS });
    const $ = cheerio.load(searchPage);
    let searchResults = collectSearchResults($);
    return searchResults;
}

function collectEpisodes($) {
    let episodes = [];
    $('.card-body .row a').each(function (ind, element) {
        let title = $(this).text();
        // Only getting subbed for now
        if (!title.includes('Sub')) return;
        let url = $(this).attr('href');
        episodes.push({ title, url });
    });
    return episodes;
}

async function getAnime(url) {
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    let episodes = collectEpisodes($);
    return episodes.reverse();
}

async function getQualities(url) {
    let qualities = new Map();
    const episodePage = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    let [, sources] = SOURCES_REG.exec(episodePage);
    sources = JSON.parse(sources);
    for (const source of sources) {
        if (source.host === 'trollvid') {
            qualities.set('unknown', `https://trollvid.net/embed/${source.id}`);
        } else if (source.host === 'mp4upload') {
            qualities.set('unknown', `https://www.mp4upload.com/embed-${source.id}.html`)
        } else {
            continue;
        }

        qualities = formatQualities(qualities, {
            referer: url,
            extractor: source.host
        });

        return { qualities };
    }
    // In the exceptional case that no sources are found error is thrown
    throw new Error('Episode sources not found');
}

module.exports = {
    search,
    getAnime,
    getQualities
}
