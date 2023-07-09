'use strict';

import * as fouranime from './4anime.js';
import * as animeflix from './animeflix.js';
import * as animefreak from './animefreak.js';
import * as animeidhentai from './animeidhentai.js';
import * as animekisa from './animekisa.js';
import * as animeout from './animeout.js';
import * as animepahe from './animepahe.js';
import * as animerush from './animerush.js';
import * as gogoanime from './gogoanime.js';
import * as hentaihaven from './hentaihaven.js';
import * as ryuanime from './ryuanime.js';
import * as twist from './twist.js';

export const SITES = [
    '4anime',
    'animeflix',
    'animefreak',
    'animeidhentai',
    'animekisa',
    'animeout',
    'animepahe',
    'animerush',
    'gogoanime',
    'hentaihaven',
    'ryuanime',
    'twist',
];

const siteMap = new Map([
    ['4anime', fouranime],
    ['animeflix', animeflix],
    ['animefreak', animefreak],
    ['animeidhentai', animeidhentai],
    ['animekisa', animekisa],
    ['animeout', animeout],
    ['animepahe', animepahe],
    ['animerush', animerush],
    ['gogoanime', gogoanime],
    ['hentaihaven', hentaihaven],
    ['ryuanime', ryuanime],
    ['twist', twist],
]);

const SITE_NAME_REG = /https?:\/\/(?:www\d{0,2}\.)?(.*)\./;

export function siteLoader(siteName) {
    if (siteName.startsWith('http'))
        [, siteName] = siteName.match(SITE_NAME_REG);

    if (!siteMap.has(siteName)) return null;

    const site = siteMap[siteName];
    return site;
}
