'use strict';

const { exec } = require('child_process');

const cloudscraper = require('cloudscraper');

const {
    getHeaders
} = require('../utils');

exports.extract = async function ({ url, referer = '' }) {
    referer = referer || url;
    const page = await cloudscraper.get(url, { headers: getHeaders({ 'Referer': referer }) });
    const [, obsfucatedJS] = page.match(/eval\((.*)\)/);
    const deobsfucatedJS = eval(`const extract = () => (${obsfucatedJS}); extract()`);
    const [, streamURL] = deobsfucatedJS.match(/player\.src\("([^"]+)/);
    return { url: streamURL, referer: url };
}
