'use strict';

const flatCache = require('flat-cache');

// Taken from https://gist.github.com/p1ho/1c7d81db13be872440699202fef1c474
module.exports = class Cache {
    constructor(name, path = '', cacheTime = 60) {
        this.name = name;
        this.path = path;
        this.cache = flatCache.load(name, path);
        this.expire = cacheTime === 0 ? false : cacheTime * 1000 * 60;
    }

    getKey(key) {
        const now = new Date().getTime();
        const value = this.cache.getKey(key);
        if (value === undefined) {
            return undefined;
        } else {
            if (value.expire !== false && value.expire < now) {
                this.removeKey(key);
                return undefined;
            } else {
                return value.data;
            }
        }
    }

    setKey(key, value) {
        const now = new Date().getTime();
        this.cache.setKey(key, {
            expire: this.expire === false ? false : now + this.expire,
            data: value,
        });
        this.cache.save();
        // Strange behaviour, if this is not done changes aren't persisted
        // even though save is called above.
        this.cache.getKey(key);
    }

    removeKey(key) {
        this.cache.removeKey(key);
        this.cache.save();
    }

    save() {
        this.cache.save(true);
    }

    remove() {
        flatCache.clearCacheById(this.name, this.path);
    }

    all() {
        return this.cache.all();
    }
};
