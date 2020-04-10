'use strict';

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
    extractKsplayer,
}
