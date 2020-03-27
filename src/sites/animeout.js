'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://www.animeout.xyz/';
const qualityReg = /(\d{3,4}p)/;
const realURLReg = /var url = "([^"]+)/;

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

async function getAnime(url) {
    // animeout has awkward naming, may need a better way to filter out links
    // and give proper titles
    let episodes = [], number = 1;
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const $ = cheerio.load(page);
    let animeName = $('div.article-content h4').first().text();
    if (!animeName) animeName = $('div.article-content h1').first().text() || 'Unknown';

    $('article.post a').each(function (ind, element) {
        let title = $(this).text();
        const url = $(this).attr('href');
        if (!title.includes('Direct Download')) return;
        // To avoid awkward cases where name is just Direct Download
        title = title === 'Direct Download' ? `${animeName} Episode ${number}` : title;
        number++;
        episodes.push({ title: title, url: url });
    });
    return episodes;
}

async function getEpisode(title, url) {
    let qualities = new Map();
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    let $ = cheerio.load(page);
    let realDLPage = $('a.btn').first().attr('href');
    realDLPage = await cloudscraper.get(realDLPage, { headers: getHeaders() });
    let [, quality] = qualityReg.exec(realDLPage);
    const [, realURL] = realURLReg.exec(realDLPage);
    quality = quality || 'unknown';
    qualities.set(quality, realURL);
    return { title: title, qualities: qualities };
}

module.exports = {
    search,
    getAnime,
    getEpisode
};
