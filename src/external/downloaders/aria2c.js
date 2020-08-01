'use strict';

const { executeCommand } = require('../../utils');
const config = require('../../config').getConfig().dl.aria2c;

/**
 * Executes aria2c to download the file from the given url
 * to the specified directory
 *
 * @param {string} directory
 * @param {string} url
 * @param {string} referer
 */
module.exports.download = async (directory, fileName, url, referer) => {
    const args = [
        `${url}`,
        `-d ${directory}`,
        `-o ${fileName}`,
        `--referer=${referer}`,
        ...config,
    ];
    await executeCommand('aria2c', args);
};
