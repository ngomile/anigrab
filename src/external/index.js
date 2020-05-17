'use strict';

const DOWNLOADERS = module.exports.DOWNLOADERS = [
    'aria2c'
];

/**
 * Dynamically loads the downloader that happens to be
 * in downloaders
 * 
 * @param {string} downloaderName
 */
module.exports.downloadLoader = function (downloaderName) {
    if (!DOWNLOADERS.includes(downloaderName)) {
        // Downloader not supported
        return null;
    }
    return require(`./downloaders/${downloaderName}`);
}
