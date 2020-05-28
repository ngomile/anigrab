'use strict';

const request = require('../request');
const {
    SearchResult,
    Anime,
    Episode
} = require('./common');
const {
    getHeaders,
    formatQualities
} = require('../utils');

const config = require('../config').getConfig().siteconfig.animeflix;

/** Base site url for animeflix */
const SITE_URL = 'https://animeflix.io';
/** The url to perform search queries to animeflix */
const SEARCH_URL = 'https://animeflix.io/api/search';
/** The base url of an anime on animeflix */
const ANIME_URL = 'https://animeflix.io/shows';
/** The api url to return episode list from animeflix */
const EPISODE_SCHEMA_URL = 'https://animeflix.io/api/anime-schema';
/** The url to get id of episode from animeflix */
const EPISODE_URL = 'https://animeflix.io/api/episode';
/** The url to get download links for an episode from animeflix */
const VIDEO_LINKS_URL = 'https://animeflix.io/api/videos'
/** The url to retrieve metadata of an anime from animeflix */
const META_URL = 'https://animeflix.io/api/anime/detail';

const DEFAULT_HEADERS = getHeaders({ Referer: 'https://animeflix.io' });

/**
 * Executes search query for animeflix
 *
 * @param {string} query
 * @returns {Promise<SearchResult[]>}
 */
async function search(query) {
    let searchResults = [];
    const params = { q: query };
    let searchResponse = await request.get(SEARCH_URL, { qs: params, headers: DEFAULT_HEADERS })
    searchResponse = JSON.parse(searchResponse).data;

    for (const { title, slug, cover_photo } of searchResponse) {
        searchResults.push(new SearchResult(
            title,
            `${ANIME_URL}/${slug}`,
            cover_photo
        ));
    }

    return searchResults;
}

/**
 * Extracts the title and episodes from animeflix
 *
 * @param {string} url
 * @returns {Promise<Anime>}
 */
async function getAnime(url) {
    let episodes = [];
    const [, slug] = url.match(/shows\/(.*)/);
    const headers = getHeaders({ Referer: url });
    let meta = await request.get(META_URL, { qs: { slug }, headers });
    let episodeList = await request.get(EPISODE_SCHEMA_URL, { qs: { slug }, headers });

    meta = JSON.parse(meta).data;
    episodeList = JSON.parse(episodeList).episodes;
    const { title } = meta;

    for (const { episodeNumber, url } of episodeList) {
        episodes.push(new Episode(
            `${title} Episode ${episodeNumber}`,
            `${SITE_URL}${url}`.replace(/\-(dub|sub)$/, '/$1')
        ));
    }

    return new Anime(title, episodes);
}

/**
 * Extracts the url and referer and extractor for the episode
 * with it's associated quality from animeflix
 *
 * @param {string} url
 * @returns {Promise<Map<string, any>>}
 */
async function getQualities(url) {
    const { version, server, fallbackServers } = config;
    const headers = getHeaders({ Referer: url });
    let qualities = new Map();
    let fallbackQualities = new Map();
    const [, slug, episode_num] = url.match(/shows\/(.*)\/episode\-(\d+)/);

    let episode = await request.get(EPISODE_URL, { qs: { episode_num, slug }, headers });
    const { id } = JSON.parse(episode).data.current;
    let downloadLinks = await request.get(VIDEO_LINKS_URL, { qs: { episode_id: id }, headers });
    downloadLinks = JSON.parse(downloadLinks);

    for (const { provider, file, lang, resolution, type } of downloadLinks) {
        if (version !== lang || type !== 'mp4') {
            continue;
        }

        if (server === provider) {
            qualities.set(resolution, file);
        } else if (fallbackServers.includes(provider)) {
            if (fallbackQualities.has(provider)) {
                fallbackQualities.get(provider).set(resolution, file);
            } else {
                fallbackQualities.set(provider, new Map([[resolution, file]]));
            }
        }
    }

    if (!qualities.size) {
        for (const server of fallbackServers) {
            if (fallbackQualities.has(server)) {
                qualities = fallbackQualities.get(server);
                break;
            }
        }
    }

    qualities = formatQualities(qualities, {
        extractor: 'universal',
        referer: url
    });
    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities
}
