'use strict';

const rp = require('request-promise');

const { ExtractedInfo } = require('./common');
const { getHeaders } = require('../utils');

/** Regular expression to match the source url of the video */
const SOURCE_REG = /source src="([^"]+)/;

/**
 * Extracts stream url and referer from trollvid
 *
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
exports.extract = async function ({ url, referer = '' }) {
    referer = referer || url;
    const page = await rp.get(url, { headers: getHeaders({ Referer: referer }) });
    const [, src] = SOURCE_REG.exec(page);
    // trollvid doesn't give the actual url of the video immediately
    // doing this gets the actual url
    const response = await rp.get(src, {
        headers: getHeaders({ 'Referer': url }),
        followAllRedirects: false,
        followRedirect: false,
        resolveWithFullResponse: true,
        simple: false
    });
    const streamURL = response.headers.location;
    return new ExtractedInfo(streamURL, src);
}
