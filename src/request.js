'use strict';

const path = require('path');
const fs = require('fs');

const FileCookieStore = require('tough-cookie-filestore');

const { CONFIG_DIR, getConfig } = require('./config');
const COOKIES_FILE = path.join(CONFIG_DIR, 'cookies.json');

if (!fs.existsSync(COOKIES_FILE)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(COOKIES_FILE, '');
}

const requestOptions = { timeout: 30000, json: true };
const { requestConfig } = getConfig();

const rp = require('request-promise').defaults({
    jar: new FileCookieStore(COOKIES_FILE),
    ...requestOptions,
});

const cloudscraper = require('cloudscraper').defaults({
    jar: true,
    ...requestOptions,
});

const delay = numRetry =>
    Math.pow(2, numRetry) * 1000 + Math.floor(Math.random() * 1000);
const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, { cf, ...options }) {
    const requestHandler = cf ? cloudscraper : rp;

    let retries = 0;
    while (true) {
        try {
            const result = await requestHandler(url, options);
            return result;
        } catch (error) {
            if (retries < requestConfig.retryAttempts) {
                retries++;
                await timeout(delay(retries));
                continue;
            }

            throw new Error('Request Error', { cause: error });
        }
    }
}

async function get(url, options = {}) {
    options.method = 'GET';
    const result = await request(url, options);
    return result;
}

async function post(url, options = {}) {
    options.method = 'POST';
    const result = await request(url, options);
    return result;
}

module.exports = {
    get,
    post,
    delay,
    timeout,
};
