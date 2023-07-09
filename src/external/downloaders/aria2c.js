'use strict';

import { executeCommand } from '../../utils.js';
import { getConfig } from '../../config.js';
import { USER_AGENTS } from '../../user_agents.js';

const config = getConfig().dl.aria2c;

/**
 * Executes aria2c to download the file from the given url
 * to the specified directory
 *
 * @param {string} directory
 * @param {string} url
 * @param {string} referer
 */
export async function download(directory, fileName, url, referer) {
    const args = [
        `${url}`,
        `-d ${directory}`,
        `-o ${fileName}`,
        `--referer=${referer}`,
        `-U ${USER_AGENTS[0]}`,
        ...config,
    ];

    await executeCommand('aria2c', args);
}
