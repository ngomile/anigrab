'use strict';

const rp = require('request-promise');
const cloudscraper = require('cloudscraper');

async function request(url, options, cf = true) {
    options.timeout = 15000;
    const requestHandler = cf ? cloudscraper : rp;
    let retries = 0;
    const delay = numRetry => (Math.pow(2, numRetry) * 1000) + Math.floor(Math.random() * 1000);
    const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    }

    try {
        return await httpRequest(url, options);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

async function get(url, options, cf = true) {
    options.method = 'GET';
    return await request(url, options, cf);
}

async function post(url, options, cf = true) {
    options.method = 'POST';
    return await request(url, options, cf);
}

module.exports = {
    get,
    post
}
