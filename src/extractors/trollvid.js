'use strict';

import * as request from '../request.js';
import { ExtractedInfo } from './common.js';
import { getHeaders } from '../utils.js';

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
export async function extract({ url, referer = '' }) {
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
}
