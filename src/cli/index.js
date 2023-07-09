#!/usr/bin/env node
'use strict';

import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
    downloadLoader,
    DOWNLOADERS,
    playerLoader,
} from '../external/index.js';
import { siteLoader, SITES } from '../sites/index.js';
import { extractorLoader } from '../extractors/index.js';
import {
    parseEpisodeGrammar,
    pickSearchResult,
    executeTasks,
    getOtherQuality,
} from '../utils.js';

import { getConfig } from '../config.js';

const { dl: dlConfig } = getConfig();

const argv = yargs(hideBin(process.argv))
    .option('q', {
        alias: 'quality',
        default: dlConfig.quality,
        describe:
            'quality of the video, can be 720p or 1080p or any other resolution',
        type: 'string',
    })
    .option('e', {
        alias: 'episodes',
        default: '',
        describe: 'episodes to get for example "1, 2, 5:10"',
        type: 'string',
    })
    .option('w', {
        alias: 'write',
        default: false,
        describe:
            'writes stream urls by appending them to a file named anime.txt in current working directory',
        type: 'boolean',
    })
    .option('s', {
        alias: 'site',
        default: dlConfig.site,
        describe: `the site to get the anime from, choose ${SITES.join(', ')}`,
        type: 'string',
    })
    .option('u', {
        alias: 'url',
        deault: false,
        describe: 'prints stream url of episode',
        type: 'boolean',
    })
    .option('fb', {
        alias: 'fallback',
        default: '',
        describe:
            'comma separated string of qualities to choose if quality asked for is not found e.g 360p, 480p',
        type: 'string',
    })
    .option('d', {
        alias: 'directory',
        default: dlConfig.directory,
        describe: 'the directory to download the file to',
        type: 'string',
    })
    .option('p', {
        alias: 'play',
        default: false,
        describe: 'play the episode using mpv',
        type: 'boolean',
    })
    .option('sk', {
        alias: 'skip',
        default: false,
        describe: 'skips downloading the file',
        type: 'boolean',
    })
    .option('xd', {
        alias: 'external-downloader',
        default: 'aria2c',
        describe: `the external downloader to use to download the file. Default is aria2c`,
        type: 'string',
    })
    .option('ft', {
        alias: 'filter-title',
        default: '',
        describe: 'regular expression to filter episodes based on their titles',
        type: 'string',
    })
    .help().argv;

async function main() {
    let animeurl = argv._[0];
    let writeStream;
    let filterTitle;
    if (!animeurl) {
        console.log('Provide anime url or name');
        return;
    }

    if (argv.filterTitle) filterTitle = new RegExp(argv.filterTitle);

    const site = siteLoader(animeurl) || siteLoader(argv.site);
    // prettier-ignore
    const siteNotFound = !site || (animeurl.startsWith('http') && !SITES.some(site => animeurl.includes(site)));
    if (siteNotFound) {
        console.log(`Site not found for ${animeurl} or ${argv.site}`);
        return;
    }

    if (!/https?.*/.test(animeurl)) {
        const searchResults = await site.search(animeurl);
        if (searchResults.length === 0) {
            console.log(`No search results found for ${animeurl}`);
            return;
        }

        animeurl = await pickSearchResult(searchResults);
    }

    // set to skip downloading if user just wants to see urls or write to file
    if (argv.write || argv.url || argv.play) argv.skip = true;

    if (argv.write)
        writeStream = fs.createWriteStream('anime.txt', { flags: 'a' });

    console.log(`Extracting ${animeurl}`);
    const anime = await site.getAnime(animeurl);
    // Sites like animeout list all episodes and there qualities on the same page
    // if title filter is specified, filter the episodes first then proceed to
    // parse episode grammar to avoid breaking the episodes returned
    const episodes = parseEpisodeGrammar(
        anime.episodes.filter(episode => {
            return filterTitle && !filterTitle.test(episode.title)
                ? false
                : true;
        }),
        argv.episodes
    );
    const args = episodes.map(({ url }) => [url]);
    const qualitiesList = await executeTasks(site.getQualities, ...args);

    for (const [ind, { qualities }] of qualitiesList.entries()) {
        let quality = qualities.get(argv.quality);
        if (!quality) {
            console.log(
                `Quality ${argv.quality} not found. Trying other qualities`
            );
            quality = getOtherQuality(qualities, argv.fallback);
        }

        if (!quality) {
            console.log('Failed to find quality');
            continue;
        }

        const { extract } = extractorLoader(quality.extractor);
        const { url, referer } = await extract(quality);

        if (argv.url && url !== '') console.log(url);

        if (argv.write) writeStream.write(`${url}\n`);

        if (argv.play) {
            const { play } = playerLoader('mpv');
            await play(url, referer);
        }

        if (url && !argv.skip) {
            const { download } = downloadLoader(argv.externalDownloader);
            // Avoid stopping the whole download process because of an error
            // will still console.error the error though
            try {
                let ext = url.match(/(mkv|mp4)/) || [];

                if (ext.length) [, ext] = ext;
                else ext = 'mp4';

                const fileName = `${episodes[ind].title}.${ext}`;
                await download(argv.directory, fileName, url, referer);
                console.log(`Finished downloading ${url}`);
            } catch (error) {
                console.error(error);
            }
        }
    }
}

main();
