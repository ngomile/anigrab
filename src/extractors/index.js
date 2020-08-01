'use strict';

const EXTRACTORS = (module.exports.EXTRACTORS = [
    'kwik',
    'mp4upload',
    'trollvid',
    'universal',
]);

module.exports.extractorLoader = function (extractorName) {
    if (!EXTRACTORS.includes(extractorName)) return null;
    const extractor = require(`./${extractorName}`);
    return extractor;
};
