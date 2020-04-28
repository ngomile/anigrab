#!/usr/bin/env node
'use strict';

const fs = require('fs');

const yargs = require('yargs');

const { siteLoader } = require('../sites/');
const { extractorLoader } = require('../extractors/');
const {
    parseEpisodeGrammar,
    input
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
            describe: 'the site to get the anime from',
            type: 'string'
        },
        'u': {
            alias: 'url',
            deault: false,
            describe: 'prints stream url of episode',
            type: 'boolean'
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
        for (let i = 0; i < searchResults.length; i++) {
            console.log(`${i + 1}. ${searchResults[i].title}`);
        }

        let choice = await input('Please select an anime [1]: ');
        choice = parseInt(choice, 10);
        if (choice >= 1 && choice <= searchResults.length) {
            choice -= 1;
            animeurl = searchResults[choice].url;
        } else {
            console.log(`Please pick a value between 1 and ${searchResults.length}`);
            return;
        }
    }

    if (argv.write) {
        stream = fs.createWriteStream('anime.txt', { flags: 'a' });
    }

    const anime = await site.getAnime(animeurl);
    for (const { url: episodeurl } of parseEpisodeGrammar(anime.episodes, argv.episodes)) {
        const { qualities } = await site.getQualities(episodeurl);
        let quality = qualities.get(argv.quality);
        if (!quality) {
            console.log(`Quality ${argv.quality} not found. Trying other qualities`);
            quality = qualities.get('unknown');
            qualities.delete('unknown');
            let otherQualites = [];
            for (const otherQuality of qualities.keys()) {
                otherQualites.push(otherQuality);
            }
            otherQualites.reverse();

            if (otherQualites.length) {
                console.log(`${otherQualites[0]} selected`);
                quality = qualities.get(otherQualites[0]);
            } else if (quality !== undefined) {
                console.log('Unknown quality will be used');
            }
        }

        const { extract } = extractorLoader(quality.extractor);
        const { url } = await extract(quality);

        if (argv.url) {
            console.log(url);
        }

        if (argv.write) {
            stream.write(`${url}\n`);
        }
    }
}

main();
