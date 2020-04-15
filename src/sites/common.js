class SearchResult {
    constructor(title, url, poster = '') {
        this.title = title;
        this.url = url;
        this.poster = poster;
    }

    toString() {
        return this.title;
    }
}

class Episode {
    constructor(title, url) {
        this.title = title;
        this.url = url;
    }

    toString() {
        return this.title;
    }
}

module.exports = {
    SearchResult,
    Episode
}
