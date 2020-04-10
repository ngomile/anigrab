'use strict';

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const VIDSTREAM_DOWNLOAD_REG = /(https:\/\/vidstreaming.io\/download[^"]+)/;

function getHeaders(headers = {}) {
    return {
        'User-Agent': 'Mozilla/5.0 CK={} (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
        ...headers
    }
}

async function extractKsplayer(url, referer = '') {
    referer = referer || url;
    let qualities = new Map();
    const page = await cloudscraper.get(url, { headers: getHeaders({ Referer: referer }) });

    const $ = cheerio.load(page);
    $('.download_links a').each(function (ind, element) {
        const quality = $(this).find('span').text().toLowerCase();
        const source = $(this).attr('href');
        qualities.set(quality, source);
    });

    return qualities;
}

async function extractVidstream(url, referer = '') {
    referer = referer || url;
    const headers = getHeaders({ 'Referer': referer });
    let qualities = new Map(), page;

    if (!url.includes('download')) {
        page = await cloudscraper.get(url, { headers: headers });
        [, url] = page.match(VIDSTREAM_DOWNLOAD_REG);
    }
    page = await cloudscraper.get(url, { headers: headers });

    const $ = cheerio.load(page);
    $('.mirror_link').first().find('a').each(function (ind, element) {
        const url = $(this).attr('href');
        let quality = url.match(/(\d{3,4}P)/);
        // If quality regex worked use destructuring to capture the matching group
        // from quality otherwise quality is unknown
        if (quality) [, quality] = quality;
        else quality = 'unknown';
        quality = quality.toLowerCase();
        qualities.set(quality, url);
    });

    return qualities;
}

function formatQualities(qualities, extra) {
    for (const quality of qualities.keys()) {
        qualities.set(quality, {
            ...extra,
            url: qualities.get(quality)
        });
    }
    return qualities;
}

module.exports = {
    extractKsplayer,
    extractVidstream,
    getHeaders,
    formatQualities
}
