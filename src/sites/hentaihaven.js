'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://hentaihaven.xxx/';
const apiURL = 'https://hentaihaven.xxx/wp-admin/admin-ajax.php';

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

async function getAnime(url) {
    let episodes = [];
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const $ = cheerio.load(page);
    const title = $('h1').first().text().trim();

    $('.wp-manga-chapter').each(function (ind, element) {
        const episodeNum = $(this).find('a').text().trim();
        const url = $(this).find('a').attr('href');
        episodes.push({ title: `${title} - ${episodeNum}`, url: url });
    });

    return episodes;
}

async function getEpisode(title, url) {
    let qualities = new Map();
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const [, playerSrc] = page.match(/iframe src="([^"]+)/);
    const playerPage = await cloudscraper.get(playerSrc, { headers: getHeaders() });
    let [, videoData] = playerPage.match(/\$\.ajax\((\{.*\})/);
    const [, action, a, b] = videoData.match(/action:'(.*)',a:'(.*)',b:'(.*)'/);
    const formData = { action, a, b };
    let sourceData = await cloudscraper.post(apiURL, {
        headers: {
            'Referer': playerSrc,
            'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
        },
        formData: formData
    });

    const sources = JSON.parse(sourceData.match(/(\{.*\})/)[1]).sources;
    for (const source of sources) {
        qualities.set(source.label, source.src);
    }

    return { title: title, qualities: qualities };
}

module.exports = {
    search,
    getAnime,
    getEpisode
}
