'use strict';

const fetch = require('node-fetch');
const { CookieJar } = require('tough-cookie');

// Default request options passed to cloudscraper
const requestOptions = { timeout: 30000, json: true };
const { requestConfig } = require('./config').getConfig();

const cloudscraper = require('cloudscraper').defaults({
    jar: true,
    ...requestOptions,
});

// Instantiate CookieJar for storing node-fetch cookies
const cookieJar = new CookieJar();

const delay = numRetry => {
    return Math.pow(2, numRetry) * 1000 + Math.floor(Math.random() * 1000);
};

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, { cf, ...options }) {
    const requestHandler = cf ? cloudscraper : fetch;

    // If using node-fetch request handler configure cookies
    // to be sent with its request
    if (!cf) {
        options[headers] = {
            // Retain headers that were applied prior
            ...options[headers],
            Cookie: cookieJar.getCookieStringSync(url),
        };
    }

    let retries = 0;
    while (true) {
        try {
            const response = await requestHandler(url, options);

            // If using node-fetch request handler properly set cookies in jar
            // from server response
            if (!cf) {
                const cookies = response.headers.raw()['set-cookie'];
                cookies.forEach(cookie => {
                    cookieJar.setCookieSync(cookie, url);
                });
            }

            return response;
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
    const response = await request(url, options);
    return response;
}

async function post(url, options = {}) {
    options.method = 'POST';
    const response = await request(url, options);
    return response;
}

module.exports = {
    get,
    post,
    delay,
    timeout,
};
