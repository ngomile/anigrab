#!/usr/bin/env node
'use strict';

const fs = require('fs');

const yargs = require('yargs');

const {
    downloadLoader,
    DOWNLOADERS
} = require('../external/');
const {
    siteLoader,
    SITES
} = require('../sites/');
const { extractorLoader } = require('../extractors/');
const {
    parseEpisodeGrammar,
    pickSeachResult,
    executeTasks,
    getOtherQuality
} = require('../utils');

const argv = yargs.
    options({
        'q': {
            alias: 'quality',
            default: '1080p',
            describe: 'quality of the video, can be 720p or 1080p or any other resolution',
            type: 'string'
        },
        'e': {
            alias: 'episodes',
            default: '',
            describe: 'episodes to get for example "1, 2, 5:10"',
            type: 'string'
        },
        'w': {
            alias: 'write',
            default: false,
            describe: 'writes stream urls to file named anime.txt in current working directory',
            type: 'boolean'
        },
        's': {
            alias: 'site',
            default: 'animepahe',
            describe: `the site to get the anime from, choose ${SITES.join(', ')}`,
            type: 'string'
        },
        'u': {
            alias: 'url',
            deault: false,
            describe: 'prints stream url of episode',
            type: 'boolean'
        },
        'fb': {
            alias: 'fallback',
            default: '',
            describe: 'comma separated string of qualities to choose if quality asked for is not found e.g 360p, 480p',
            type: 'string'
        },
        'd': {
            alias: 'directory',
            default: '',
            describe: 'the directory to download the file to',
            type: 'string'
        },
        'sk': {
            alias: 'skip',
            default: false,
            describe: 'skips downloading the file',
            type: 'boolean'
        },
        'xd': {
            alias: 'external-downloader',
            default: 'aria2c',
            describe: `the external downloader to use to download the file, choose ${DOWNLOADERS.join(', ')}`,
            type: 'string'
        }
    })
    .help()
    .argv

async function main() {
    let animeurl = argv._[0], stream;
    if (!animeurl) {
        console.log('Provide anime url or name');
        return;
    }

    const site = siteLoader(animeurl) || siteLoader(argv.site);
    if (!site) {
        console.log('Site not found for %s or %s', animeurl, argv.site);
        return;
    }

    if (!animeurl.startsWith('http')) {
        const searchResults = await site.search(animeurl);
        if (searchResults.length === 0) {
            console.log(`No search results found for ${animeurl}`);
            return;
        }

        animeurl = await pickSeachResult(searchResults);
    }

    // set to skip downloading if user just wants to see urls or write to file
    if (argv.write || argv.url) {
        argv.skip = true;
    }

    if (argv.write) {
        stream = fs.createWriteStream('anime.txt', { flags: 'a' });
    }

    console.log(`Extracting ${animeurl}`);
    const anime = await site.getAnime(animeurl);
    const episodes = parseEpisodeGrammar(anime.episodes, argv.episodes);
    const args = episodes.map(({ url }) => [url]);
    const qualitiesList = await executeTasks(site.getQualities, ...args);

    for (const { qualities } of qualitiesList) {
        let quality = qualities.get(argv.quality);
        if (!quality) {
            console.log(`Quality ${argv.quality} not found. Trying other qualities`);
            quality = getOtherQuality(qualities, argv.fallback);
        }

        if (!quality) {
            console.log('Failed to find quality');
            continue;
        }

        const { extract } = extractorLoader(quality.extractor);
        const { url, referer } = await extract(quality);

        if (argv.url && url !== '') {
            console.log(url);
        }

        if (argv.write) {
            stream.write(`${url}\n`);
        }

        if (url && !argv.skip) {
            const { download } = downloadLoader(argv.externalDownloader);
            // Avoid stopping the whole download process because of an error
            // will still console.error the error though
            try {
                await download(argv.directory, url, referer);
                console.log(`Finished downloading ${url}`);
            } catch (error) {
                console.error(error);
            }
        }
    }
}

main();
