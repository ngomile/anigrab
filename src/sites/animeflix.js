'use strict';

const request = require('../request');
const { SearchResult, Anime, Episode } = require('./common');
const { getHeaders, formatQualities } = require('../utils');

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
const VIDEO_LINKS_URL = 'https://animeflix.io/api/videos';
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
    const { data } = await request.get(
        SEARCH_URL,
        { qs: params, headers: DEFAULT_HEADERS },
        true
    );

    for (const { title, slug, cover_photo } of data) {
        searchResults.push(
            new SearchResult(title, `${ANIME_URL}/${slug}`, cover_photo)
        );
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

    // Speed up fetching meta and episode information by requesting
    // both concurrently
    const [{ title }, episodeData] = await Promise.all([
        request.get(META_URL, { qs: { slug }, headers }, true),
        request.get(EPISODE_SCHEMA_URL, { qs: { slug }, headers }, true),
    ]);

    if (episodeData['@type'] === 'Movie') {
        episodes.push(
            new Episode(`${title}`, `${episodeData.potentialAction.target}`)
        );
    } else {
        for (const { episodeNumber, url } of episodeData.episodes) {
            episodes.push(
                new Episode(
                    `${title} Episode ${episodeNumber}`,
                    `${SITE_URL}${url}`.replace(/\-(dub|sub)$/, '/$1')
                )
            );
        }
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

    const {
        data: {
            current: { id: episode_id },
        },
    } = await request.get(
        EPISODE_URL,
        { qs: { episode_num, slug }, headers },
        true
    );
    const downloadLinks = await request.get(
        VIDEO_LINKS_URL,
        { qs: { episode_id }, headers },
        true
    );

    for (const { provider, file, lang, resolution, type } of downloadLinks) {
        if (version !== lang || type !== 'mp4') continue;

        if (server === provider) {
            qualities.set(resolution, file);
        } else if (fallbackServers.includes(provider)) {
            if (fallbackQualities.has(provider))
                fallbackQualities.get(provider).set(resolution, file);
            else fallbackQualities.set(provider, new Map([[resolution, file]]));
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
        referer: url,
    });
    return { qualities };
}

module.exports = {
    search,
    getAnime,
    getQualities,
};
