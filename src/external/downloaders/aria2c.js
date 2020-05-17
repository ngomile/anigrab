'use strict';

const { executeCommand } = require('../../utils');

/**
 * Executes aria2c to download the file from the given url
 * to the specified directory
 * 
 * @param {string} directory
 * @param {string} url
 * @param {string} referer
 */
module.exports.download = async (directory, url, referer) => {
    const args = [`${url}`, `-d ${directory}`, '-c', '-x 2', '-V', `--referer=${referer}`];
    await executeCommand('aria2c', args);
}