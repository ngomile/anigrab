'use strict';

import { ExtractedInfo } from './common.js';

/**
 * This extractor simply returns the url and referer it was
 * given under the assumption that those are the actual urls
 *
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
export async function extract({ url, referer = '' }) {
    referer = referer || url;
    return new ExtractedInfo(url, referer);
}
