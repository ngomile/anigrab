const request = require('../request');
const { ExtractedInfo } = require('./common');
const {
    getHeaders,
    bypassCaptcha,
    generateFormData
} = require('../utils');

const OPTIONS = {
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: false,
    followRedirect: false
};

let passToken;
/**
 * Extracts stream url and referer from kwik
 *
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
module.exports.extract = async function ({ url }) {
    url = url.replace(/\be\b/, 'f');
    const headers = getHeaders({ Referer: url });
    let response;
    if (!passToken) {
        passToken = await bypassCaptcha(url, headers);
        const { bypassURL, form } = await generateFormData(url, passToken, headers);
        response = await request.post(bypassURL, {
            headers,
            form,
            ...OPTIONS
        });
    }

    const [, obsfucatedJS] = response.body.match(/(var _.*?=.*)/);
    let deobsfucatedJS;
    eval(`eval = input => {deobsfucatedJS = input;}; ${obsfucatedJS}`);
    const [, postURL, _token] = deobsfucatedJS.match(/action="([^"]+).*value="([^"]+)/);
    const form = { _token };
    response = await request.post(postURL, { headers, form, ...OPTIONS });
    return new ExtractedInfo(response.headers.location, url);
}
