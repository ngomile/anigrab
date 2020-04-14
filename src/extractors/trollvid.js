'use strict';

const rp = require('request-promise');

const { getHeaders } = require('../utils');

const SOURCE_REG = /source src="([^"]+)/;

async function extract({ url, referer = '' }) {
    referer = referer || url;
    const page = await rp.get(url, { headers: getHeaders({ 'Referer': referer }) });
    const [, src] = SOURCE_REG.exec(page);
    const response = await rp.get(src, {
        headers: getHeaders({ 'Referer': url }),
        followAllRedirects: false,
        followRedirect: false,
        resolveWithFullResponse: true,
        simple: false
    });
    const streamURL = response.headers.location;
    return { url: streamURL, referer: src };
}
