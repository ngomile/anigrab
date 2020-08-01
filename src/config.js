// Code taken and modified from https://github.com/vn-ki/anime-downloader/blob/master/anime_downloader/config.py

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

let Config;
const CONFIG_DIR =
    os.platform() === 'win32'
        ? path.join(process.env.APPDATA, 'anigrab')
        : path.join(process.env.HOME, '.config', 'anigrab');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
    dl: {
        directory: '.',
        quality: '1080p',
        site: 'animekisa',
        aria2c: ['-c true', '-x 2', '-V'],
    },
    players: {
        mpv: [],
    },
    siteconfig: {
        animekisa: {
            server: 'gcloud',
            fallbackServers: ['mp4upload', 'vidstream'],
        },
        animepahe: {
            version: 'subbed',
        },
        gogoanime: {
            server: 'gcloud',
            fallbackServers: ['mp4upload', 'yourupload', 'vidstream'],
        },
        ryuanime: {
            version: 'subbed',
            server: 'trollvid',
            fallbackServers: ['mp4upload'],
        },
        animeflix: {
            server: 'AUEngine',
            fallbackServers: ['FastStream'],
            version: 'sub',
        },
    },
};

function writeConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4));
}

function readConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
        return config;
    } catch (error) {
        console.error('Incorrectly formatted config file');
        console.error(error);
    }
}

function update(gkey, toObj, fromObj) {
    if (!toObj.hasOwnProperty(gkey)) toObj[gkey] = {};

    for (const [key, val] of Object.entries(fromObj[gkey])) {
        if (!toObj[gkey].hasOwnProperty(key)) {
            toObj[gkey][key] = val;
        } else if (
            typeof fromObj[gkey][key] === 'object' &&
            fromObj[gkey][key] !== null
        ) {
            update(key, toObj[gkey], fromObj[gkey]);
        }
    }
}

function getConfig() {
    if (typeof Config === 'object' && Config !== null) return Config;

    try {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    } catch (error) {
        // Failing hard like this should be avoided, will change in the future
        console.error('Failed to make config directory');
        console.error(error);
        process.exit();
    }

    if (!fs.existsSync(CONFIG_FILE)) {
        writeConfig(DEFAULT_CONFIG);
        Config = DEFAULT_CONFIG;
        return DEFAULT_CONFIG;
    } else {
        let config = readConfig();

        for (const prop in DEFAULT_CONFIG) {
            update(prop, config, DEFAULT_CONFIG);
        }
        writeConfig(config);
        // Taken from https://stackoverflow.com/questions/21363912/how-to-resolve-a-path-that-includes-an-environment-variable-in-nodejs
        const directory = config.dl.directory;
        config.dl.directory = directory.replace(
            /%([^%]+)%/g,
            (_, n) => process.env[n]
        );
        Config = config;
        return config;
    }
}

module.exports = {
    getConfig,
    CONFIG_DIR,
};
