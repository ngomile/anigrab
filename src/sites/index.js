'use strict';

const SITES = (module.exports.SITES = [
    '4anime',
    'animeflix',
    'animefreak',
    'animeidhentai',
    'animekisa',
    'animeout',
    'animepahe',
    'gogoanime',
    'hentaihaven',
    'ryuanime',
    'twist',
]);

const SITE_NAME_REG = /https?:\/\/(?:www\d{0,2}\.)?(.*)\./;

module.exports.siteLoader = function (siteName) {
    if (siteName.startsWith('http'))
        [, siteName] = siteName.match(SITE_NAME_REG);
    if (!SITES.includes(siteName)) return null;
    const site = require(`./${siteName}`);
    return site;
};
