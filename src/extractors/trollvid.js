'use strict';

const request = require('../request');
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
module.exports.extract = async function ({ url, referer = '' }) {
    referer = referer || url;
    const page = await request.get(url, {
        headers: getHeaders({ Referer: referer }),
    });
    const [, src] = SOURCE_REG.exec(page);
    // trollvid doesn't give the actual url of the video immediately
    // doing this gets the actual url
    const response = await request.get(src, {
        headers: getHeaders({ Referer: url }),
        followAllRedirects: false,
        followRedirect: false,
        resolveWithFullResponse: true,
        simple: false,
    });
    const streamURL = response.headers.location;
    return new ExtractedInfo(streamURL, src);
};
