exports.SearchResult = class {
    constructor(title, url, poster = '') {
        this.title = title;
        this.url = url;
        this.poster = poster;
    }
}
