exports.siteLoader = function (siteName) {
    try {
        const site = require(`./${siteName}`);
        return site;
    } catch (error) {
        console.log(`Failed to load ${siteName}`);
        throw error;
    }
}