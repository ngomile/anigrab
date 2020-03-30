'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://animekisa.tv/search';
const siteURL = 'https://animekisa.tv';

function getHeaders() {
    return {
        'Referer': 'https://animekisa.tv',
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
    }
}

async function search(query) {
    let searchResults = [];
    const params = { q: query };
    const searchPage = await cloudscraper.get(searchURL, { headers: getHeaders(), qs: params });
    const $ = cheerio.load(searchPage);
    $('.lisbox22 a.an').each(function (ind, element) {
        let title = $(this).find('.similardd').text();
        let url = `${siteURL}${$(this).attr('href')}`;
        let poster = `${siteURL}${$(this).find('img').attr('src')}`;
        // Avoid putting garbage result into search results
        if (url === siteURL + '/') return;
        searchResults.push({ title: title, url: url, poster: poster });
    });
    return searchResults;
}

async function getAnime(url) {
    let episodes = [];
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const $ = cheerio.load(page);
    const title = $('h1.infodes').first().text();
    $('a.infovan').each(function (ind, element) {
        let episodeNum = $(this).find('.infoept2 .centerv').text();
        let episodeTitle = `${title} Episode ${episodeNum}`;
        let url = `${siteURL}/${$(this).attr('href')}`;
        episodes.push({ title: episodeTitle, url: url });
    });
    return episodes.reverse();
}

async function getEpisode(title, url) {
    let qualities = new Map();
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    let [, source] = page.match(/var VidStreaming = "([^"]+)/);
    if (!source) [, source] = page.match(/var MP4Upload = "([^"]+)/);
    qualities.set('unknown', source);
    return { title: title, qualities: qualities };
}

module.exports = {
    search,
    getAnime,
    getEpisode
}
