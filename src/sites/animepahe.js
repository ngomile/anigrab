'use strict';

const cloudscraper = require('cloudscraper');

const animeURL = 'https://animepahe.com/anime/';
const apiURL = 'https://animepahe.com/api';
const supportedServers = ['kwik', 'mp4upload'];
const animeIDReg = /&id=(\d+)/;
const serverReg = /data-provider="([^"]+)/g;
const idSessionReg = /getEmbeds\((\d+), "([^"]+)/g;


// Returns the default headers to use for animepahe
function getHeaders() {
    return {
        'referer': 'https://animepahe.com/',
        'user-agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
    }
}

// Formats animepahe search results
function handleSearchResult(searchResult) {
    return {
        title: searchResult.title || 'N/A',
        url: `${animeURL}${searchResult.slug}`,
        poster: searchResult.image || 'N/A',
        status: searchResult.status || 'N/A'
    }
}

// Returns search results from animepahe for the given query
async function search(query) {
    const searchParams = { l: 8, m: 'search', q: query };
    const response = await cloudscraper.get(apiURL, { qs: searchParams, headers: getHeaders() });
    const results = JSON.parse(response);
    return results.data ? results.data.map(handleSearchResult) : [];
}

// Returns page information from animepahe api
async function getPageData(animeID, page = 1) {
    const params = { m: 'release', id: animeID, sort: 'episode_asc', page: page };
    const response = await cloudscraper.get(apiURL, { qs: params, headers: getHeaders() });
    const data = JSON.parse(response);
    return data;
}

// Retrieves episode data from animepahe api page results
function getEpisodes(title, url, animeData) {
    let episodes = [];
    const data = animeData.data ? animeData.data : [];

    for (const { episode: episodeNum, id, snapshot: poster } of data) {
        episodes.push({
            title: `${title} Episode ${episodeNum}`,
            url: `${url}/${id}`,
            poster: poster
        });
    }
    return episodes;
}

// Collects relevant details of anime such as title, description and episodes
async function getAnime(url) {
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const [, title,] = /<h1>([^<]+)/.exec(page);
    const [, animeID,] = animeIDReg.exec(page);
    if (!animeID) throw new Error(`Failed to find anime id for url: ${url}`);

    let pageData = await getPageData(animeID);
    let episodes = getEpisodes(title, url, pageData);
    let startPage = pageData.current_page, lastPage = pageData.last_page;

    if (startPage < lastPage) {
        startPage++, lastPage++;
        for (let i = startPage; i < lastPage; i++) {
            pageData = await getPageData(animeID, i);
            episodes = episodes.concat(getEpisodes(title, url, pageData));
        }
    }

    return episodes;
}

// Extracts all the servers that are hosting the episode
function getServers(page) {
    let servers = [], match, server;
    do {
        match = serverReg.exec(page);
        if (match) {
            [, server,] = match;
            servers.push(server);
        }
    } while (match);
    return servers;
}

// Extracts the qualities for a given episode returning a mapping of
// qualities and their associated urls
async function getQualities(server, episodeID, session) {
    let qualities = new Map();
    const params = { 'id': episodeID, 'm': 'embed', 'p': server, 'session': session };
    const apiResult = await cloudscraper.get(apiURL, { qs: params, headers: getHeaders() });

    if (apiResult === '') throw new Error(`Incorrect API usage with parameters: ${params}`);
    const providerInfo = Object.values(JSON.parse(apiResult).data);

    for (const info of providerInfo) {
        const [quality] = Object.keys(info);
        qualities.set(`${quality}p`, info[quality].url);
    }
    return qualities;
}

// Extracts episode data for animepahe
async function getEpisode(title, url) {
    let qualities;
    const episodePage = await cloudscraper.get(url, { headers: getHeaders() });
    const servers = getServers(episodePage);
    const [, episodeID, session,] = idSessionReg.exec(episodePage);

    if (!servers) throw new Error(`No servers found for ${title} with url ${url}`);
    // We only get the necessary qualities and urls from one server while ignoring unsupported ones
    for (const server of servers) {
        if (!supportedServers.includes(server)) continue;
        qualities = await getQualities(server, episodeID, session);
        break;
    }
    return { title: title, qualities: qualities };
}

module.exports = {
    search,
    getAnime,
    getEpisode
}
