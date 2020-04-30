'use strict';

const readline = require('readline');
const { promisify } = require('util');

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const { Episode } = require('./sites/common');
const { USER_AGENTS } = require('./user_agents');

/** Regular expression to find the download url for vidstream */
const VIDSTREAM_DOWNLOAD_REG = /(https:\/\/vidstreaming.io\/download[^"]+)/;

/**
 * Creates an object of headers
 * 
 * @param {object} headers 
 * @returns {object}
 */
function getHeaders(headers = {}) {
    return {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        ...headers
    }
}

/**
 * Extracts the quality and the associated url from ksplayer
 * 
 * @param {string} url 
 * @param {string} referer
 * @returns {Promise<Map<string, string>>} 
 */
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

/**
 * Extracts the quality and the associated url from vidstream
 * 
 * @param {string} url 
 * @param {string} referer
 * @returns {Promise<Map<string, string>>}
 */
async function extractVidstream(url, referer = '') {
    referer = referer || url;
    const headers = getHeaders({ 'Referer': referer });
    let qualities = new Map(), page;

    if (!url.includes('download')) {
        // Find the download page
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
        if (quality) {
            [, quality] = quality;
        }
        else {
            quality = 'unknown';
        }
        quality = quality.toLowerCase();
        qualities.set(quality, url);
    });

    return qualities;
}

/**
 * Given a mapping of qualities to associated urls
 * modifies the mapping as to give more information
 * such as the extractor and referer to use from extra
 * 
 * @param {Map<string, string>} qualities 
 * @param {object} extra 
 * @returns {Map<string, object>}
 */
function formatQualities(qualities, extra) {
    for (const quality of qualities.keys()) {
        qualities.set(quality, {
            ...extra,
            url: qualities.get(quality)
        });
    }
    return qualities;
}

/**
 * Given a list of episodes and a grammar for example
 * 1,2,9:90 values from 1 to 2 to 9 through 90 will
 * be extracted from the list of episodes at those given
 * indexes
 * 
 * @param {Episode[]} episodes 
 * @param {string} grammar
 * @returns {Episode[]}
 */
function parseEpisodeGrammar(episodes, grammar = '') {
    let parsedEpisodes = [];
    const SINGLE_EPISODE_REG = /^(\d+)$/;
    const RANGED_EPISODES_REG = /^(\d+)?:(\d+)?$/;
    for (let episodeGrammar of grammar.split(',')) {
        episodeGrammar = episodeGrammar.trim();
        if (SINGLE_EPISODE_REG.test(episodeGrammar)) {
            let [, num] = SINGLE_EPISODE_REG.exec(episodeGrammar);
            num = parseInt(num) - 1;
            if (num < episodes.length) parsedEpisodes.push(episodes[num]);
        } else if (RANGED_EPISODES_REG.test(episodeGrammar)) {
            let [, start, end] = RANGED_EPISODES_REG.exec(episodeGrammar);
            parsedEpisodes.push(...episodes.slice(start - 1, end));
        } else if (grammar.trim() === '') parsedEpisodes = episodes;
    }
    return parsedEpisodes;
}

/**
 * Asks the user for input and returns their anser
 * 
 * @param {string} prompt 
 * @returns {string}
 */
async function input(prompt) {
    // Taken from https://gist.github.com/tinovyatkin/4316e302d8419186fe3c6af3f26badff
    readline.Interface.prototype.question[promisify.custom] = function (prompt) {
        return new Promise(resolve =>
            readline.Interface.prototype.question.call(this, prompt, resolve)
        );
    };

    readline.Interface.prototype.questionAsync = promisify(
        readline.Interface.prototype.question
    );

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const answer = await rl.questionAsync(prompt);
    rl.close();
    return answer;
}

/**
 * Creates a list of numbers from start to end
 * 
 * @param {number} start 
 * @param {number} end 
 */
function range(start, end) {
    let numbers = [];
    if (start > end) {
        return numbers;
    }
    while (start < end) {
        numbers.push(start++);
    }
    return numbers;
}

/**
 * Executes the function with the arguments simultaneously
 * 
 * @param {function} func 
 * @param  {...any} args 
 */
async function executeTasks(func, ...args) {
    let results = []
    while (args.length) {
        const tasks = args.slice(0, 4).map(arg => func(...arg));
        for await (const result of tasks) {
            results.push(result);
        }
        args = args.splice(4);
    }
    return results;
}

module.exports = {
    extractKsplayer,
    extractVidstream,
    getHeaders,
    formatQualities,
    parseEpisodeGrammar,
    input,
    range,
    executeTasks
}
