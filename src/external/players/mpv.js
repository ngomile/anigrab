import { executeCommand } from '../../utils.js';
import { getConfig } from '../../config.js';

const { mpv: mpvConfig } = getConfig().players;

export async function play(url, referer) {
    const args = [
        ...mpvConfig,
        `--http-header-fields=referer:${referer}`,
        `${url}`,
    ];

    await executeCommand('mpv', args);
}
