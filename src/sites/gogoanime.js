'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const siteURL = 'https://www16.gogoanime.io';
const searchURL = 'https://ajax.gogocdn.net/site/loadAjaxSearch';
const apiURL = 'https://ajax.gogocdn.net/ajax/load-list-episode';

function getHeaders() {
    return {
        'Referer': 'https://www16.gogoanime.io/',
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
    }
}

async function search(query) {
    let searchResults = [];
    const params = { keyword: query, id: '-1', link_web: 'https://www16.gogoanime.io/' };
    let searchResponse = await cloudscraper.get(searchURL, { headers: getHeaders(), qs: params });
    searchResponse = JSON.parse(searchResponse).content;
    const $ = cheerio.load(searchResponse);

    $('.list_search_ajax').each(function (ind, element) {
        let title = $(this).find('.ss-title').text();
        let url = $(this).find('.ss-title').attr('href');
        let poster = $(this).find('.thumbnail-recent_search').attr('style');
        [, poster] = poster.match(/"([^"]+)/);
        searchResults.push({ title: title, url: url, poster: poster });
    });

    return searchResults;
}

async function getAnime(url) {
    let episodes = [];
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    let $ = cheerio.load(page);

    const animeName = $('title').text().replace(' at Gogoanime', '');
    const movieID = $('#movie_id').first().attr('value');
    const [, alias] = url.match(/category\/(.*)$/);
    const params = { ep_start: 0, ep_end: 9000, id: movieID, default_ep: 0, alias: alias };
    const response = await cloudscraper.get(apiURL, { headers: getHeaders(), qs: params });
    $ = cheerio.load(response);

    $('#episode_related a').each(function (ind, element) {
        let episodeNum = $(this).find('.name').text().replace('EP ', '');
        let title = `${animeName} Episode ${episodeNum}`;
        let url = $(this).attr('href').trim();
        url = `${siteURL}${url}`;
        episodes.push({ title: title, url: url });
    });

    return episodes.reverse();
}

module.exports = {
    search,
    getAnime
}
