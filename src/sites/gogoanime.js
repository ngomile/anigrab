'use strict';

const cheerio = require('cheerio');

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { getHeaders, formatQualities, extractQualities } = require('../utils');

const config = require('../config').getConfig().siteconfig.gogoanime;

/** The url of the site */
const SITE_URL = 'https://www16.gogoanime.io';
/** The url to perform search queries on */
const SEARCH_URL = 'https://www18.gogoanime.io//search.html';
/** The url to make api calls to */
const API_URL = 'https://ajax.gogocdn.net/ajax/load-list-episode';

/** Regular expression to match the alias of the anime */
const ALIAS_REG = /category\/(.*)$/;
/** Mapping of providers to associated regular expressions */
const SOURCES_REG = new Map([
    ['vidstream', /href="(https:\/\/vidstreaming.io\/download.*)" target/],
    ['mp4upload', /data-video="(.*)"> Mp4Upload/],
    ['gcloud', /data-video="(.*)">Xstreamcdn/],
    ['yourupload', /data-video="(.*)">YourUpload/],
]);

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://www16.gogoanime.io/' });

/**
 * Collects the search results
 *
 * @param {CheerioStatic} $
 * @returns {SearchResult[]}
 */
function collectSearchResults($) {
    let searchResults = [];
    $('.items .img').each(function (ind, element) {
        const title = $(this).find('a').attr('title');
        let url = $(this).find('a').attr('href');
        url = `${SITE_URL}${url}`;
        const poster = $(this).find('img').attr('src');
        const searchResult = new SearchResult(title, url, poster);
        searchResults.push(searchResult);
    });
    return searchResults;
}

/**
 * Executes search query for gogoanime
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    const params = { keyword: query };
    const searchResponse = await request.get(
        SEARCH_URL,
        {
            headers: DEFAULT_HEADERS,
            qs: params,
        },
        true
    );
    const $ = cheerio.load(searchResponse);
    let searchResults = collectSearchResults($);
    return searchResults;
}

/**
 * Collects the episodes of the anime
 *
 * @param {CheerioStatic} $
 * @param {string} animeName
 */
function collectEpisodes($, animeName) {
    let episodes = [];
    $('#episode_related a').each(function (ind, element) {
        const episodeNum = $(this).find('.name').text().replace('EP ', '');
        const title = `${animeName} Episode ${episodeNum}`.replace('  ', ' ');
        let url = $(this).attr('href').trim();
        url = `${SITE_URL}${url}`;
        const episode = new Episode(title, url);
        episodes.push(episode);
    });
    return episodes.reverse();
}

/**
 * Extracts the title and episodes from gogoanime
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS }, true);
    let $ = cheerio.load(page);
    const title = $('h1').text();
    const movieID = $('#movie_id').first().attr('value');
    const [, alias] = url.match(ALIAS_REG);
    const params = {
        ep_start: 0,
        ep_end: 9000,
        id: movieID,
        default_ep: 0,
        alias,
    };
    const response = await request.get(
        API_URL,
        {
            headers: DEFAULT_HEADERS,
            qs: params,
        },
        true
    );

    $ = cheerio.load(response);
    const episodes = collectEpisodes($, title);
    const anime = new Anime(title, episodes);
    return anime;
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from gogoanime
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    const { server, fallbackServers } = config;
    const page = await request.get(url, { headers: DEFAULT_HEADERS }, true);
    const info = { page, server, url, sourcesReg: SOURCES_REG };

    let { qualities, extractor } = await extractQualities(info);
    for (const fallbackServer of fallbackServers) {
        if (qualities.size) break;
        ({ qualities, extractor } = await extractQualities({
            ...info,
            server: fallbackServer,
        }));
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
