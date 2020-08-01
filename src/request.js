'use strict';

const path = require('path');
const fs = require('fs');

const FileCookieStore = require('tough-cookie-filestore');
let rp = require('request-promise');
let cloudscraper = require('cloudscraper');

const { CONFIG_DIR } = require('./config');

const COOKIES_FILE = path.join(CONFIG_DIR, 'cookies.json');
if (!fs.existsSync(COOKIES_FILE)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(COOKIES_FILE, '');
}

const jar = rp.jar(new FileCookieStore(COOKIES_FILE));
rp = rp.defaults({ jar, timeout: 30000, json: true });
cloudscraper = cloudscraper.defaults({ jar: true, timeout: 30000, json: true });

const delay = numRetry =>
    Math.pow(2, numRetry) * 1000 + Math.floor(Math.random() * 1000);
const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, options, cf = false) {
    const requestHandler = cf ? cloudscraper : rp;
    let retries = 0;
    const httpRequest = async (url, options) => {
        try {
            return await requestHandler(url, options);
        } catch (error) {
            retries++;
            if (retries < 10) {
                await timeout(delay(retries));
                return await httpRequest(url, options);
            }
            throw error;
        }
    };

    try {
        return await httpRequest(url, options);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

async function get(url, options = {}, cf = false) {
    options.method = 'GET';
    return await request(url, options, cf);
}

async function post(url, options = {}, cf = false) {
    options.method = 'POST';
    return await request(url, options, cf);
}

module.exports = {
    get,
    post,
    delay,
    timeout,
};
