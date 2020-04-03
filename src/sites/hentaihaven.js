'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://hentaihaven.xxx/';

function getHeaders() {
    return {
        'Referer': 'https://hentaihaven.xxx/hentai/',
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
    }
}

async function search(query) {
    let searchResults = [];
    const params = { s: query, post_type: 'wp-manga' };
    const searchResponse = await cloudscraper.get(searchURL, { headers: getHeaders(), qs: params });
    const $ = cheerio.load(searchResponse);
    $('.c-tabs-item__content').each(function (ind, element) {
        const title = $(this).find('h3 a').first().text();
        const url = $(this).find('h3 a').first().attr('href');
        const poster = $(this).find('img').attr('src');
        searchResults.push({ title: title, url: url, poster: poster });
    });
    return searchResults;
}

module.exports = {
    search
}
