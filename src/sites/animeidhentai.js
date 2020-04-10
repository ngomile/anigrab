'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const searchURL = 'https://animeidhentai.com/search/';
const apiURL = 'https://animeidhentai.com/wp-admin/admin-ajax.php';
const urlReg = /<a href="([^"]+)/;
const dataIDReg = /player" data-id="([^"]+)/;

function getHeaders() {
    return {
        'Referer': 'https://animeidhentai.com/',
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko'
    }
}

async function search(query) {
    let searchResults = [];
    query = query.replace(' ', '+').toLowerCase();
    const search = `${searchURL}${query}`;
    const response = await cloudscraper.get(search, { headers: getHeaders() });
    const $ = cheerio.load(response);

    $('.movies-lst .hentai').each(function (ind, element) {
        const title = $(this).find('h2').text();
        const poster = $(this).find('img').attr('src');
        // Simply doing $(this).find('a') isn't working for some reason
        const [, url] = $(this).html().match(urlReg);
        searchResults.push({ title, url, poster });
    });

    return searchResults;
}

async function getAnime(url) {
    let episodes = [], page, $;
    if (!url.startsWith('https://animeidhentai.com/hentai/')) {
        page = await cloudscraper.get(url, { headers: getHeaders() });
        $ = cheerio.load(page);
        url = $('.entry-footer').find('a').last().attr('href');
    }
    page = await cloudscraper.get(url, { headers: getHeaders() });

    $ = cheerio.load(page);
    $('.hentai').each(function (ind, element) {
        const title = $(this).find('h2').text();
        const [, url] = $(this).html().match(urlReg);
        episodes.push({ title, url });
    });

    return episodes.reverse();
}

async function getEpisode(title, url) {
    let qualities, subTypes = new Map();
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const [, id] = page.match(dataIDReg);
    const idToStream = new Map([['0', 'sub'], ['1', 'sub-2'], ['2', 'nosub']]);
    const $ = cheerio.load(page);

    $('.opt-player button').each(function (ind, element) {
        const streamID = $(this).attr('data-opt');
        const subType = idToStream.get(streamID);
        subTypes.set(subType, streamID);
    });

    // TODO: This should be set by user
    const subType = subTypes.get('sub-2') || subTypes.get('sub');
    const formData = { id: id, action: 'ajax_player', opt: subType };
    const streamPage = await cloudscraper.post(apiURL, {
        headers: { ...getHeaders(), 'Referer': url },
        formData: formData
    });
    let [, streamURL] = streamPage.match(/src="([^"]+)/);
    streamURL = streamURL.replace('embed', 'download');
    qualities = await extractKsplayer(streamURL);
    return { title, qualities };
}

async function extractKsplayer(url) {
    let qualities = new Map();
    const page = await cloudscraper.get(url, { headers: getHeaders() });
    const $ = cheerio.load(page);

    $('.download_links a').each(function (ind, element) {
        const quality = $(this).find('span').text().toLowerCase();
        const source = $(this).attr('href');
        qualities.set(quality, source);
    });

    return qualities;
}

module.exports = {
    search,
    getAnime,
    getEpisode
}
