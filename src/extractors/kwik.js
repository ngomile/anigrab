'use strict';

const cloudscraper = require('cloudscraper');

const { getHeaders } = require('../utils');

const EVAL_REG = /;eval\((.*)\)/
const STREAM_PARTS_REG = /https:\/\/(.*?)\..*\/(\d+)\/(.*)\/.*token=(.*)&expires=([^\']+)/;
const TITLE_REG = /title>(.*)</;

exports.extract = async function ({ url, referer = '' }) {
    referer = referer || url;
    const page = await cloudscraper.get(url, { headers: getHeaders({ 'Referer': referer }) });
    const [, title] = page.match(TITLE_REG);
    const [, obsfucatedJS] = page.match(EVAL_REG);
    const deobsfucatedJS = eval(`const extract = () => (${obsfucatedJS}); extract()`);
    const [, cdn, digits, file, token, expires] = deobsfucatedJS.match(STREAM_PARTS_REG);
    const streamURL = `https://${cdn}.nextstream.org/get/${token}/${expires}/mp4/${digits}/${file}/${title}`
    return { url: streamURL, referer: url };
}
