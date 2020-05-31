'use strict';

const puppeteer = require('puppeteer-core');

const { ExtractedInfo } = require('./common');
const config = require('../config').getConfig();

/** Path to browser executable to be used by puppeteer */
const { browserExecutablePath } = config;
/** Regular expression to block out unneeded requests to improve performance */
const BLOCKED_RESOURCES_REG = /ads|inpagepush|css|vipicmou|cloud|png|ueuodgnrhb|shqbsdjatunl|hcaptcha|plyr|hls/;

/**
 * Extracts stream url and referer from kwik
 * 
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
module.exports.extract = async function ({ url }) {
    let browser;
    let streamUrl = '';
    try {
        // Replace url to target download page instead of embed page
        url = url.replace(/\be\b/, 'f');
        browser = await puppeteer.launch({
            executablePath: browserExecutablePath
        });
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (BLOCKED_RESOURCES_REG.test(request.url())) {
                request.abort();
            } else if (request.url().startsWith('https://files-eu')) {
                streamUrl = request.url();
                request.abort();
            } else {
                request.continue();
            }
        });
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });
        await Promise.all([
            page.waitForNavigation({
                waitUntil: 'networkidle2'
            }),
            page.click('button')
        ]);
    } catch (error) {
        console.error(error);
        process.exit(1);
    } finally {
        if (browser !== undefined) {
            await browser.close();
        }
    }
    return new ExtractedInfo(streamUrl, url);
}
