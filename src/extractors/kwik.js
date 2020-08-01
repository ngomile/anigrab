'use strict';

const request = require('../request');
const { ExtractedInfo } = require('./common');
const {
    cache,
    executeCommand,
    getHeaders,
    bypassCaptcha,
    generateFormData,
} = require('../utils');

const DEFAULT_HEADERS = getHeaders();
const OPTIONS = {
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: false,
    followRedirect: false,
};

/**
 * Extracts stream url and referer from kwik
 *
 * @param {object} obj
 * @param {string} obj.url
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
module.exports.extract = async function ({ url }) {
    let response;
    url = url.replace(/\be\b/, 'f');
    const { hostname } = new URL(url);

    let headers = cache.getKey('kwikHeaders');
    let passToken = cache.getKey(hostname);
    // If pass token not found in cache then cookies were not stored
    // from prior requests. Get pass token again.
    if (!passToken) {
        passToken = await bypassCaptcha(url);
        headers = getHeaders({ ...DEFAULT_HEADERS, Referer: url });
        cache.setKey('kwikHeaders', headers);
        const { bypassURL, form } = await generateFormData(
            url,
            passToken,
            headers
        );
        response = await request.post(bypassURL, { headers, form, ...OPTIONS });
    } else {
        response = await request.get(url, { headers, ...OPTIONS });
    }

    const [, obsfucatedJS] = response.body.match(/(var _[\w]+=.*)/);
    const deobsfucatedJS = await executeCommand('node', [
        '-e',
        `eval=console.log; ${obsfucatedJS}`,
    ]);
    const [, postURL, _token] = deobsfucatedJS.match(
        /action="([^"]+).*?value="([^"]+)/
    );
    const form = { _token };
    response = await request.post(postURL, { headers, form, ...OPTIONS });
    return new ExtractedInfo(response.headers.location, url);
};
