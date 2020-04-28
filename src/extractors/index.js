const EXTRACTORS = exports.EXTRACTORS = [
    'kwik',
    'mp4upload',
    'trollvid',
    'universal',
];

exports.extractorLoader = function (extractorName) {
    if (!EXTRACTORS.includes(extractorName)) {
        return null
    };
    const extractor = require(`./${extractorName}`);
    return extractor;
}
