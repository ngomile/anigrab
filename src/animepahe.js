'use strict';

const cloudscraper = require('cloudscraper');

const animeURL = 'https://animepahe.com/anime/';
const apiURL = 'https://animepahe.com/api';


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
    return JSON.parse(response).data.map(handleSearchResult);
}

module.exports = {
    search
}
