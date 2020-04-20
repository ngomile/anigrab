exports.extractorLoader = function (extractorName) {
    try {
        const extractor = require(`./${extractorName}`);
        return extractor;
    } catch (error) {
        console.log(`Failed to load extractor: ${extractorName}`);
        throw error;
    }
}