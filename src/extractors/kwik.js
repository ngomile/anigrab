'use strict';

const cloudscraper = require('cloudscraper');

const { ExtractedInfo } = require('./common');
const { getHeaders } = require('../utils');

/** Regular expression to match javascript that needs to be evaulated */
const EVAL_REG = /;eval\((.*)\)/
/** Regular expression that extracts the necessary information to make stream url */
const STREAM_PARTS_REG = /https:\/\/(.*?)\..*\/(\d+)\/(.*)\/.*token=(.*)&expires=([^\']+)/;
/** Regular expression to get title of file for use in the stream url */
const TITLE_REG = /title>(.*)</;

/**
 * Extracts stream url and referer from kwik
 * 
 * @param {object} obj
 * @param {string} obj.url
 * @param {string} [obj.referer]
 * @returns {Promise<ExtractedInfo>} The extracted information
 */
exports.extract = async function ({ url, referer = '' }) {
    referer = referer || url;
    const page = await cloudscraper.get(url, { headers: getHeaders({ Referer: referer }) });
    const [, title] = page.match(TITLE_REG);
    const [, obsfucatedJS] = page.match(EVAL_REG);
    const deobsfucatedJS = eval(`const extract = () => (${obsfucatedJS}); extract()`);
    const [, cdn, digits, file, token, expires] = deobsfucatedJS.match(STREAM_PARTS_REG);
    const streamURL = `https://${cdn}.nextstream.org/get/${token}/${expires}/mp4/${digits}/${file}/${title}`
    return new ExtractedInfo(streamURL, url);
}
