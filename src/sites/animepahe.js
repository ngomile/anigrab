'use strict';

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const {
    getHeaders,
    formatQualities,
    range,
    executeTasks,
} = require('../utils');

const config = require('../config').getConfig().siteconfig.animepahe;

/** Part of the url for anime combined with slug to make full url */
const ANIME_URL = 'https://animepahe.com/anime/';
/** The url to make api calls on */
const API_URL = 'https://animepahe.com/api';

/** Regular expression to match the id of the anime */
const ANIME_ID_REG = /&id=(\d+)/;
/** Regular expression to match part of episode url */
const ANIME_CODE_REG = /https:\/\/animepahe.com\/anime\/(.*)"/;
/** Regular expression to match the server the episode is on */
const SERVER_REG = /data-provider="([^"]+)/g;
/** Regular expression to extract the id and session for the episode */
const ID_SESSION_REG = /getUrls\((\d+), "([^"]+)/;
/** Regular expresion to find the title of the anime */
const TITLE_REG = /<h1>([^<]+)/;

/** List of supported servers */
const SUPPORTED_SERVERS = ['kwik', 'mp4upload'];

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://animepahe.com/' });

const versionToSub = new Map([
    ['subbed', 'jpn'],
    ['dubbed', 'eng'],
]);

/**
 * Handles correctly extracting search result from animepahe
 *
 * @param {object} obj
 * @param {string} obj.title
 * @param {string} obj.slug
 * @param {string} obj.poster
 * @returns {SearchResult}
 */
function handleSearchResult({ title, session, poster }) {
    const url = `${ANIME_URL}${session}`;
    return new SearchResult(title, url, poster);
}

/**
 * Executes a search query on animepahe
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    const searchParams = { l: 8, m: 'search', q: query };
    const { data } = await request.get(
        API_URL,
        { qs: searchParams, headers: DEFAULT_HEADERS },
        true
    );
    // Search results are stored in the data field
    return data ? data.map(handleSearchResult) : [];
}

/**
 * Gets the episode data for a given page
 *
 * @param {string|number} animeID
 * @param {number} page
 * @returns {Promise<any>}
 */
async function getPageData(animeID, page = 1) {
    const params = {
        m: 'release',
        id: animeID,
        sort: 'episode_asc',
        page: page,
    };
    const response = await request.get(
        API_URL,
        { qs: params, headers: DEFAULT_HEADERS },
        true
    );
    return response;
}

/**
 * Extracts the episodes from anime data
 *
 * @param {string} title
 * @param {string} url
 * @param {object} animeData
 * @returns {Episode[]}
 */
function getEpisodes(title, url, animeData) {
    let episodes = [];
    const { data = [] } = animeData;

    for (const { episode: episodeNum, session } of data) {
        // Have to correct format the title and url
        const _title = `${title} Episode ${episodeNum}`;
        const _url = `${url}/${session}`;
        const episode = new Episode(_title, _url);
        episodes.push(episode);
    }
    return episodes;
}

/**
 * Extracts the title and episodes from animepahe
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    const page = await request.get(url, { headers: DEFAULT_HEADERS }, true);
    const [, title] = TITLE_REG.exec(page);
    const [, animeID] = ANIME_ID_REG.exec(page);
    const [, animeCode] = ANIME_CODE_REG.exec(page);
    url = `https://animepahe.com/play/${animeCode}`;

    if (!animeID) throw new Error(`Failed to find anime id for url: ${url}`);

    let pageData = await getPageData(animeID);
    let episodes = getEpisodes(title, url, pageData);
    let startPage = pageData.current_page,
        lastPage = pageData.last_page;

    // In case there is more than one page extract the rest of the episodes
    if (startPage < lastPage) {
        startPage++, lastPage++;
        // Speed up collecting of other episodes
        let args = range(startPage, lastPage).map(pageNum => [
            animeID,
            pageNum,
        ]);
        const pageDataList = await executeTasks(getPageData, ...args);
        for (pageData of pageDataList) {
            episodes.push(...getEpisodes(title, url, pageData));
        }
    }

    const anime = new Anime(title, episodes);
    return anime;
}

/**
 * Finds the servers that are hosting the episode
 *
 * @param {string} page
 * @returns {string[]}
 */
function getServers(page) {
    let servers = [],
        match,
        server;
    do {
        match = SERVER_REG.exec(page);
        if (match) {
            [, server] = match;
            servers.push(server);
        }
    } while (match);
    return servers;
}

/**
 * Extracts the quality mapping to it's url from the api
 *
 * @param {string} server
 * @param {string|number} episodeID
 * @param {string} session
 * @returns {Promise<Map<string, string>>}
 */
async function getEpisodeQualities(server, episodeID, session) {
    const version = versionToSub.get(config.version);
    const { fansub: sub, fallbackFansubs } = config;
    let qualities = new Map();
    let fallbackQualities = new Map();
    const params = { id: episodeID, m: 'embed', p: server, session: session };
    const { data = '' } = await request.get(
        API_URL,
        { qs: params, headers: DEFAULT_HEADERS },
        true
    );

    if (data === '')
        throw new Error(`Incorrect API usage with parameters: ${params}`);
    const providerInfo = Object.values(data);

    for (const info of providerInfo) {
        const [quality] = Object.keys(info);
        const { audio, kwik, fansub } = info[quality];
        if (version !== audio) continue;
        if (sub === fansub) {
            // provider matched criteria in config
            qualities.set(`${quality}p`, kwik);
        } else {
            // provider didn't match criteria but place it into fallback
            if (fallbackQualities.has(fansub)) {
                fallbackQualities.get(fansub).set(`${quality}p`, kwik);
            } else {
                fallbackQualities
                    .set(fansub, new Map())
                    .get(fansub)
                    .set(`${quality}p`, kwik);
            }
        }
    }

    if (!qualities.size) {
        // check if fallback fansub is in the fallback qualities
        for (const fallbackFansub of fallbackFansubs) {
            if (fallbackQualities.has(fallbackFansub)) {
                qualities = fallbackQualities.get(fallbackFansub);
                break;
            }
        }

        // if no fallback fansub was found and any fansub can be used
        // then pick first one
        if (!qualities.size && fallbackFansubs.includes('any')) {
            for (const [anyFansub] of fallbackQualities.entries()) {
                qualities = fallbackQualities.get(anyFansub);
                break;
            }
        }
    }

    return qualities;
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from animepahe
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    let qualities = new Map();
    const episodePage = await request.get(
        url,
        { headers: DEFAULT_HEADERS },
        true
    );
    const servers = getServers(episodePage);
    const [, episodeID, session] = ID_SESSION_REG.exec(episodePage);

    if (!servers)
        throw new Error(`No servers found for ${title} with url ${url}`);
    // We only get the necessary qualities and urls from one server while ignoring unsupported ones
    for (const server of servers) {
        if (!SUPPORTED_SERVERS.includes(server)) continue;
        qualities = await getEpisodeQualities(server, episodeID, session);
        qualities = formatQualities(qualities, {
            extractor: server,
            referer: url,
        });
        break;
    }

    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
