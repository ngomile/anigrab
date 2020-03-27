'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://www4.ryuanime.com/search';

function getHeaders() {
    return {
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
        'Referer': 'https://www4.ryuanime.com/'
    }
}

async function search(query) {
    let searchResults = [];
    const params = { term: query };
    const searchPage = await cloudscraper.get(searchURL, { qs: params, headers: getHeaders() });
    const $ = cheerio.load(searchPage);
    $('.list-inline a').each(function (ind, elemenet) {
        searchResults.push({
            title: $(this).text(),
            url: $(this).attr('href'),
            poster: 'N/A'
        });
    });
    return searchResults;
}

async function getAnime(url) {
    let episodes = [];
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const $ = cheerio.load(page);
    $('.card-body .row a').each(function (ind, element) {
        let title = $(this).text();
        // Only getting subbed for now
        if (!title.includes('Sub')) return;
        let url = $(this).attr('href');
        episodes.push({ title: title, url: url });
    });
    return episodes.reverse();
}

module.exports = {
    search,
    getAnime
}
