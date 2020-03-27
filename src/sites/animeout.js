const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://www.animeout.xyz/';

// Returns the default headers to use for animeout
function getHeaders() {
    return {
        'Referer': 'https://animeout.xyz/',
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
    }
}

async function search(query) {
    let searchResults = [];
    const params = { 's': query, 'post_type': 'post' };
    const searchText = await cloudscraper.get(searchURL, { qs: params, headers: getHeaders() });
    const $ = cheerio.load(searchText);
    $('div.post-content').each(function (ind, element) {
        const poster = $(this).find('img').attr('src') || 'N/A';
        const title = $(this).find('h3.post-title a').text();
        const url = $(this).find('h3.post-title a').attr('href');
        searchResults.push({ title: title, poster: poster, url: url });
    });
    return searchResults;
}

module.exports = {
    search
};
