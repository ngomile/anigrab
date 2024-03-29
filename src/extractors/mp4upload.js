'use strict';

import * as request from '../request.js';
import { ExtractedInfo } from './common.js';
import { executeCommand, getHeaders } from '../utils.js';

/**
 * Extracts stream url and referer from mp4upload
 *
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
export async function extract({ url, referer = '' }) {
    referer = referer || url;
    let streamURL;
    const page = await request.get(url, {
        headers: getHeaders({ Referer: referer }),
    });
    const deletedText = 'File was deleted';
    const licensedText =
        'This video is no longer available due to a copyright claim.';

    if (page.includes(deletedText) || page.includes(licensedText)) {
        console.log(`The file has been deleted or licensed at ${url}`);
        streamURL = '';
    } else {
        const [, obsfucatedJS] = page.match(/(eval\(.*\))/);
        const deobsfucatedJS = await executeCommand('node', [
            '-e',
            `eval=console.log; ${obsfucatedJS}`,
        ]);
        [, streamURL] = deobsfucatedJS.match(/src[:\(]\s*"([^"]+)/);
    }

    return new ExtractedInfo(streamURL, url);
}
