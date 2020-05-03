'use strict';

const { spawn } = require('child_process');
const readline = require('readline');
const { promisify } = require('util');

const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

// Is there a better way to get class information without having to require?
const {
    Episode,
    SearchResult
} = require('./sites/common');
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
    let results = [];
    while (args.length) {
        const tasks = args.slice(0, 4).map(arg => func(...arg));
        for await (const result of tasks) {
            results.push(result);
        }
        args = args.splice(4);
    }
    return results;
}

/**
 * Given a list of search results, returns the url of the
 * user selected search result
 * 
 * @param {SearchResult[]} searchResults
 * @returns {string}
 */
async function pickSeachResult(searchResults) {
    for (let i = 0; i < searchResults.length; i++) {
        console.log(`${i + 1}. ${searchResults[i].title}`);
    }

    let choice = await input('Please select an anime [1]: ');
    choice = parseInt(choice, 10);
    while (choice < 1 || choice > searchResults.length) {
        choice = await input(`Please pick a value between 1 and ${searchResults.length}: `);
    }
    return searchResults[--choice].url;
}

/**
 * Given a mapping of qualities to an object with extractor, url
 * and referer properties. The function picks the highest quality
 * possible and returns the object that matched to the quality
 * 
 * @param {Map<string, any>} qualities
 * @param {string} fallbackQualities
 * @returns {any}
 */
function getOtherQuality(qualities, fallbackQualities = '') {
    // Some sites may not specify a quality
    let quality = qualities.get('unknown');
    qualities.delete('unknown');

    let otherQualites = [];
    for (const otherQuality of qualities.keys()) {
        if (fallbackQualities) {
            if (fallbackQualities.includes(otherQuality)) {
                otherQualites.push(otherQuality);
            }
            continue;
        }
        otherQualites.push(otherQuality);
    }
    // Places qualities from highest to lowest
    otherQualites.reverse();

    if (otherQualites.length) {
        console.log(`${otherQualites[0]} selected`);
        quality = qualities.get(otherQualites[0]);
    } else if (quality !== undefined) {
        console.log('Unknown quality will be used');
    }

    return quality;
}

/**
 * Executes an external command
 * 
 * @param {string} cmd 
 * @param {string[]} args 
 */
async function executeCommand(cmd, args = []) {
    // Taken from https://stackoverflow.com/questions/58570325/how-to-turn-child-process-spawns-promise-syntax-to-async-await-syntax
    const child = spawn(cmd, args);

    for await (const chunk of child.stdout) {
        // shows output on the same line
        process.stdout.write(`${chunk}\r`);
    }

    let error = '';
    for await (const chunk of child.stderr) {
        error += chunk;
    }

    const exitCode = await new Promise((resolve, reject) => {
        child.on('close', resolve);
    });

    if (exitCode) {
        throw new Error(`subprocess error exit ${exitCode}, ${error}`);
    }
}

module.exports = {
    extractKsplayer,
    extractVidstream,
    getHeaders,
    formatQualities,
    parseEpisodeGrammar,
    input,
    range,
    executeTasks,
    pickSeachResult,
    getOtherQuality,
    executeCommand
}
