'use strict';

/**
 * Represents the actual extracted url with the referer,
 * must be created by the extractors extract function
 * */
class ExtractedInfo {
    /**
     * @param {string} url
     * @param {string} referer
     */
    constructor(url, referer) {
        this.url = url;
        this.referer = referer;
    }
}

module.exports = {
    ExtractedInfo,
};
