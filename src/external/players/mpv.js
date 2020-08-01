const { executeCommand } = require('../../utils');
const { mpv: mpvConfig } = require('../../config').getConfig().players;

module.exports.play = async (url, referer) => {
    const args = [
        ...mpvConfig,
        `--http-header-fields=referer:${referer}`,
        `${url}`,
    ];
    await executeCommand('mpv', args);
};
