'use strict';

const { ExtractedInfo } = require('./common');

/**
 * This extractor simply returns the url and referer it was
 * given under the assumption that those are the actual urls
 *
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
module.exports.extract = async ({ url, referer = '' }) => {
    referer = referer || url;
    return new ExtractedInfo(url, referer);
};
