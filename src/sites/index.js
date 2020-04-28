const SITES = exports.SITES = [
    'animeidhentai',
    'animekisa',
    'animeout',
    'animepahe',
    'gogoanime',
    'hentaihaven',
    'ryuanime',
];

const SITE_NAME_REG = /https?:\/\/(?:www\d{0,2}\.)?(.*)\./;

exports.siteLoader = function (siteName) {
    if (siteName.startsWith('http')) [, siteName] = siteName.match(SITE_NAME_REG);
    if (!SITES.includes(siteName)) return null;
    const site = require(`./${siteName}`);
    return site;
}
