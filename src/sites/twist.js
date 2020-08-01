'use strict';

const fuzz = require('fuzzball');
const crypto = require('crypto-js');
const aes = require('crypto-js/aes');

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { getHeaders, formatQualities } = require('../utils');

/** Base site url */
const SITE_URL = 'https://twist.moe';
/** Base api url */
const API_URL = 'https://twist.moe/api/anime/';
/** Base url for anime */
const ANIME_URL = 'https://twist.moe/a/';

/** Regular expression to match slug part of url */
const SLUG_REG = /a\/(.*)\//;
/** Regular expression to extract anime title from episode url */
const TITLE_REG = /\] (.*) \-/;
/** Regular expression that tries to extract quality part from source url */
const QUALITY_REG = /(\d{3,4}p)/;

/** The key used for decrypting the source url */
const KEY = 'LXgIVP&PorO68Rq7dTx8N^lP!Fa5sGJ^*XK';

const DEFAULT_HEADERS = getHeaders({
    Referer: SITE_URL,
    'x-access-token': '1rj2vRtegS8Y60B3w3qNZm5T2Q0TN2NR',
});

const decrypt = source =>
    aes.decrypt(source, KEY).toString(crypto.enc.Utf8).trim();

/**
 * Executes search query for twist
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    let searchResults = [];
    const searchResponse = await request.get(API_URL, {
        headers: DEFAULT_HEADERS,
    });
    const options = {
        scorer: fuzz.partial_ratio,
        processor: choice => choice.title,
        cutoff: 85,
    };

    const results = await fuzz.extractAsPromised(
        query,
        searchResponse,
        options
    );
    // prettier-ignore
    for (const [{ title, slug: { slug } }] of results) {
        searchResults.push(new SearchResult(
            title,
            `${ANIME_URL}${slug}/first`
        ));
    }

    return searchResults;
}

/**
 * Extracts the title and episodes from twist
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    let title = '';
    let episodes = [];
    const [, slug] = url.match(SLUG_REG);
    url = `${API_URL}${slug}/sources`;
    const headers = getHeaders({ ...DEFAULT_HEADERS, Referer: url });
    const episodesResponse = await request.get(url, { headers });

    for (const { number, source } of episodesResponse) {
        const decryptedSourceUrl = `${SITE_URL}${decrypt(source)}`;
        let title = decryptedSourceUrl.match(TITLE_REG);
        if (title) [, title] = title;
        else title = decryptedSourceUrl.split(/\b\/\b/)[3].split('.')[0];

        episodes.push(
            new Episode(`${title} Episode ${number}`, decryptedSourceUrl)
        );
    }

    return new Anime(title, episodes);
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from twist
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    let quality = url.match(QUALITY_REG);
    if (quality) [, quality] = quality;
    else quality = 'unknown';

    let qualities = new Map([[quality, url]]);
    return {
        qualities: formatQualities(qualities, {
            extractor: 'universal',
            referer: url,
        }),
    };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
