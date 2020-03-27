'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://www4.ryuanime.com/search';
const sourcesReg = /episode_videos = (\[.*\])/;

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

async function getEpisode(title, url) {
    let qualities = new Map();
    const episodePage = await cloudscraper.get(url, { headers: getHeaders() });
    let [, sources] = sourcesReg.exec(episodePage);
    sources = JSON.parse(sources);
    for (const source of sources) {
        if (source.host === 'trollvid') {
            qualities.set('unknown', `trollvid.net/embed/${source.id}`);
            return { title: title, qualities: qualities };
        } else if (source.host === 'mp4upload') {
            qualities.set('unknown', `https://www.mp4upload.com/embed-${source.id}.html`)
            return { title: title, qualities: qualities };
        }
    }
    // In the exceptional case that no sources are found error is thrown
    throw new Error('Episode sources not found');
}

module.exports = {
    search,
    getAnime,
    getEpisode
}
