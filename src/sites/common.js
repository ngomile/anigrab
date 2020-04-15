class SearchResult {
    constructor(title, url, poster = '') {
        this.title = title;
        this.url = url;
        this.poster = poster;
    }
}

module.exports = {
    SearchResult
}
