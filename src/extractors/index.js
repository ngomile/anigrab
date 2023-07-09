'use strict';

import * as kwik from './kwik.js';
import * as mp4upload from './mp4upload.js';
import * as trollvid from './trollvid.js';
import * as universal from './universal.js';
import * as yourupload from './yourupload.js';

const extractorMap = new Map([
    ['kwik', kwik],
    ['mp4upload', mp4upload],
    ['trollvid', trollvid],
    ['universal', universal],
    ['yourupload', yourupload],
]);

export const EXTRACTORS = [
    'kwik',
    'mp4upload',
    'trollvid',
    'universal',
    'yourupload',
];

export function extractorLoader(extractorName) {
    if (!EXTRACTORS.includes(extractorName)) return null;

    const extractor = extractorMap[extractorName];

    return extractor;
}
