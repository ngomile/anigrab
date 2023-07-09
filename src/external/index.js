'use strict';

import * as aria2c from './downloaders/aria2c.js';

import * as mpv from './players/mpv.js';

export const DOWNLOADERS = ['aria2c'];

/**
 * Dynamically loads the downloader that happens to be
 * in downloaders
 *
 * @param {string} downloaderName
 */
export function downloadLoader(downloaderName) {
    if (!DOWNLOADERS.includes(downloaderName)) {
        // Downloader not supported
        return null;
    }

    // A bit of a cop out, but since only aria2c is being
    // used this is fine for now.
    return aria2c;
}

/**
 * Dynamically loads the player which happens to be mpv
 * for now
 *
 * @param {string} playerName
 */
export function playerLoader(playerName) {
    return mpv;
}
