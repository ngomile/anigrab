'use strict';

import * as request from '../request.js';

import { ExtractedInfo } from './common.js';
import { getHeaders } from '../utils.js';

/** Regular expression to match the source url of the video */
const SOURCE_REG = /source src="([^"]+)/;

/**
 * Extracts stream url and referer from yourupload
 *
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
export async function extract({ url, referer = '' }) {
    referer = referer || url;
    const page = await request.get(url, {
        headers: getHeaders({ Referer: referer }),
    });
    const [, streamURL] = page.match(/file:\s*'([^']+)/);
    return new ExtractedInfo(streamURL, url);
}
