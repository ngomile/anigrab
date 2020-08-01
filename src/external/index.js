'use strict';

const DOWNLOADERS = (module.exports.DOWNLOADERS = ['aria2c']);

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
};

/**
 * Dynamically loads the player which happens to be mpv
 * for now
 *
 * @param {string} playerName
 */
module.exports.playerLoader = function (playerName) {
    return require(`./players/${playerName}`);
};
