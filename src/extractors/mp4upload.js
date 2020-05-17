'use strict';

const cloudscraper = require('cloudscraper');

const { ExtractedInfo } = require('./common');
const {
    getHeaders
} = require('../utils');

/**
 * Extracts stream url and referer from mp4upload
 *
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
module.exports.extract = async function ({ url, referer = '' }) {
    referer = referer || url;
    let streamURL;
    const page = await cloudscraper.get(url, { headers: getHeaders({ Referer: referer }) });
    const deletedText = 'File was deleted';
    const licensedText = 'This video is no longer available due to a copyright claim.';

    if (page.includes(deletedText) || page.includes(licensedText)) {
        console.log(`The file has been deleted or licensed at ${url}`);
        streamURL = '';
    } else {
        const [, obsfucatedJS] = page.match(/eval\((.*)\)/);
        const deobsfucatedJS = eval(`const extract = () => (${obsfucatedJS}); extract()`);
        [, streamURL] = deobsfucatedJS.match(/src[:\(]\s*"([^"]+)/);
    }
    return new ExtractedInfo(streamURL, url);
}
