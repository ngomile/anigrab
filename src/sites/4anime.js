'use strict';

import cheerio from 'cheerio';
import * as request from '../request.js';
import { SearchResult, Anime, Episode } from './common.js';
import { getHeaders, formatQualities } from '../utils.js';
import { getRandomUserAgent } from '../user_agents.js';

// 4anime base url
const SITE_URL = 'https://4anime.is';

// Regular expression to extract source file of episode
const SOURCE_REG = /source src="([^"]+)/;

const DEFAULT_HEADERS = getHeaders({
    Referer: SITE_URL,
    'User-Agent': getRandomUserAgent(),
});

/**
 * Executes search query for 4anime
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    let searchResults = [];

    const searchResponse = await request.get(SITE_URL, {
        qs: { keyword: query },
        headers: DEFAULT_HEADERS,
        cf: true,
    });

    const $ = cheerio.load(searchResponse);
    const episodeSelector = '.anime_list > .item';

    $(episodeSelector).each(function (ind, elem) {
        const title = $(this).find('.anime_name a').text();
        const url = `${SITE_URL}${$(this).find('.anime_poster').attr('href')}`;
        const poster = $(this).find('.anime_poster-img').attr('src');
        searchResults.push(new SearchResult(title, url, poster));
    });

    return searchResults;
}

/**
 * Extracts the title and episodes from 4anime
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    let episodes = [];
    const page = await request.get(url, { headers: DEFAULT_HEADERS, cf: true });
    const $ = cheerio.load(page);
    const animeTitle = $('div').find('p.single-anime-desktop').text();

    $('.single-anime-category a').each(function (ind, elem) {
        const episodeNum = $(this).text();
        const episodeTitle = `${animeTitle} Episode ${episodeNum}`;
        const url = $(this).attr('href');
        episodes.push(new Episode(episodeTitle, url));
    });

    return new Anime(animeTitle, episodes);
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from 4anime
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    let qualities = new Map();
    const page = await request.get(url, { headers: DEFAULT_HEADERS, cf: true });
    const [, source] = page.match(SOURCE_REG);
    const [, quality] = source.match(/(\d{3,4}p)/);
    qualities.set(quality, source);
    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: url,
    });

    return { qualities };
}

export { search, getAnime, getQualities };
