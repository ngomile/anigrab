'use strict';

import * as cheerio from 'cheerio';

import * as request from '../request.js';
import { SearchResult, Anime, Episode } from './common.js';
import { getHeaders, formatQualities } from '../utils.js';
import { getConfig } from '../config.js';

const config = getConfig().siteconfig.animerush;

/** Base site url of animerush */
const SITE_URL = 'https://www.animerush.tv';
/** The url to perform search queries to animerush */
const SEARCH_URL = `${SITE_URL}/search.php`;

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://www.animerush.tv/' });

/**
 * Collects the search results from animerush
 *
 * @param {CheerioStatic} $
 * @returns {SearchResult[]}
 */
function collectSearchResults($) {
    let searchResults = [];
    $('.search-page_in_box_mid_link').each(function (ind, element) {
        const data = $(this).find('.highlightz').attr('data');
        const poster = `https${data}`;
        const title = $(this).find('h3').text();
        const url = `https:${$(this).find('.highlightit').attr('href')}`;
        const searchResult = new SearchResult(title, url, poster);
        searchResults.push(searchResult);
    });
    return searchResults;
}

/**
 * Executes a search query on animerush
 *
 * @param {string} query
 */
async function search(query) {
    const params = { searchquery: query };
    const page = await request.get(SEARCH_URL, {
        headers: DEFAULT_HEADERS,
        qs: params,
    });
    const $ = cheerio.load(page);
    let searchResults = collectSearchResults($);
    return searchResults;
}

/**
 * Extracts the title and episodes from animerush
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    let episodes = [];
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    const title = $('.amin_week_box_up1').find('h1').text();

    $('.fixedLinkColor').each(function (ind, element) {
        const episodeTitle = $(this).attr('title').replace('Watch ', '');
        const url = `https:${$(this).attr('href')}`;
        episodes.push(new Episode(episodeTitle, url));
    });

    return new Anime(title, episodes.reverse());
}

/**
 * Extracts the actual source url
 *
 * @param {string} url
 */
async function extractUrl(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(page);
    return $('iframe').last().attr('src');
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from animerush
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    const { server, fallbackServers } = config;
    let qualities = new Map();
    let sources = new Map();
    const page = await request.get(url, { headers: DEFAULT_HEADERS });

    const $ = cheerio.load(page);
    $('div.episode_mirrors h3 > a').each(function (ind, elem) {
        const source = $(this).text().toLowerCase();
        const sourceURL = `https:${$(this).attr('href')}`;

        if (source.includes('mp4upload')) {
            sources.set('mp4upload', sourceURL);
        } else if (source.includes('yourupload')) {
            sources.set('yourupload', sourceURL);
        } else {
            sources.set(source, sourceURL);
        }
    });

    for (const key of sources.keys()) {
        sources.set(key, await extractUrl(sources.get(key)));
    }

    if (sources.has(server)) {
        qualities.set('unknown', sources.get(server));
        qualities = formatQualities(qualities, {
            extractor: server,
            referer: url,
        });
    } else {
        for (const fallback of fallbackServers) {
            if (sources.has(fallback)) {
                qualities.set('unknown', sources.get(fallback));
                qualities = formatQualities(qualities, {
                    extractor: fallback,
                    referer: url,
                });
                break;
            }
        }
    }

    return { qualities };
}

export { search, getAnime, getQualities };
