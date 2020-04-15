'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const {
    extractKsplayer,
    getHeaders,
    formatQualities
} = require('../utils');

const SEARCH_URL = 'https://animeidhentai.com/search/';
const API_URL = 'https://animeidhentai.com/wp-admin/admin-ajax.php';

const URL_REG = /<a href="([^"]+)/;
const DATA_ID_REG = /player" data-id="([^"]+)/;
const SRC_REG = /src="([^"]+)/;

const DEFAULT_HEADERS = getHeaders({ 'Referer': 'https://animeidhentai.com/' });

function collectSearchResults($) {
    let searchResults = [];
    $('.movies-lst .hentai').each(function (ind, element) {
        const title = $(this).find('h2').text();
        const poster = $(this).find('img').attr('src');
        // Simply doing $(this).find('a') isn't working for some reason
        const [, url] = $(this).html().match(URL_REG);
        searchResults.push({ title, url, poster });
    });

    return searchResults;
}

async function search(query) {
    query = query.replace(' ', '+').toLowerCase();
    const search = `${SEARCH_URL}${query}`;
    const response = await cloudscraper.get(search, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(response);
    let searchResults = collectSearchResults($);
    return searchResults;
}

function collectEpisodes($) {
    let episodes = [];
    $('.hentai').each(function (ind, element) {
        const title = $(this).find('h2').text();
        const [, url] = $(this).html().match(URL_REG);
        episodes.push({ title, url });
    });
    return episodes;
}

async function getAnime(url) {
    let page, $;
    if (!url.startsWith('https://animeidhentai.com/hentai/')) {
        // In the scenario that we are not on the actual episodes page
        // find actual episodes page url
        page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
        $ = cheerio.load(page);
        url = $('.entry-footer').find('a').last().attr('href');
    }
    page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    $ = cheerio.load(page);
    let episodes = collectEpisodes($);
    return episodes.reverse();
}

function collectSubTypes($, idToStream) {
    let subTypes = new Map();
    $('.opt-player button').each(function (ind, element) {
        const streamID = $(this).attr('data-opt');
        const subType = idToStream.get(streamID);
        subTypes.set(subType, streamID);
    });
    return subTypes;
}

async function getQualities(url) {
    const page = await cloudscraper.get(url, { headers: DEFAULT_HEADERS });
    const [, id] = page.match(DATA_ID_REG);
    const idToStream = new Map([['0', 'sub'], ['1', 'sub-2'], ['2', 'nosub']]);
    const $ = cheerio.load(page);
    const subTypes = collectSubTypes($, idToStream);

    // TODO: This should be set by user
    const subType = subTypes.get('sub-2') || subTypes.get('sub');
    const formData = { id: id, action: 'ajax_player', opt: subType };
    const streamPage = await cloudscraper.post(API_URL, {
        headers: getHeaders({ 'Referer': url }),
        formData: formData
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
    getQualities
}
