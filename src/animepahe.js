'use strict';

const cloudscraper = require('cloudscraper');

const animeURL = 'https://animepahe.com/anime/';
const apiURL = 'https://animepahe.com/api';
const animeIDReg = /&id=(\d+)/;


// Returns the default headers to use for animepahe
function getHeaders() {
    return {
        'Referrer': 'https://animepahe.com/',
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
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
    const response = await cloudscraper.get(apiURL, { qs: params });
    const data = JSON.parse(response);
    return data
}

// Retrieves episode data from animepahe api page results
function getEpisodes(url, animeData) {
    let episodes = [];
    const data = animeData.data ? animeData.data : [];

    for (const { anime_title: title, episode: episodeNum, id, snapshot: poster } of data) {
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
    const response = await cloudscraper.get(url);
    const [, animeID,] = animeIDReg.exec(response);
    if (!animeID) throw new Error(`Failed to find anime id for url: ${url}`);

    let pageData = await getPageData(animeID);
    let episodes = getEpisodes(url, pageData);
    let startPage = pageData.current_page, lastPage = pageData.last_page;

    if (startPage < lastPage) {
        startPage++, lastPage++;
        for (let i = startPage; i < lastPage; i++) {
            pageData = await getPageData(animeID, i);
            episodes = episodes.concat(getEpisodes(url, pageData));
        }
    }

    return episodes;
}

module.exports = {
    search,
    getAnime
}
