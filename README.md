# anigrab

A free and open source library to extract video links from well known anime sites. Has a simple command line interface to write the urls to a file. More will be added later. Taking inspiration from [anime-downloader](https://github.com/vn-ki/anime-downloader)

##Sites
*animeidhentai
*animekisa
*animeout
*animepahe
*gogoanime
*hentaihaven
*ryuanime

##Installation
Sorry working on that!

##Usage

###Search, Get the anime and get the qualities
```javascript
const { siteLoader } = require('./sites');
const { search, getAnime, getQualities } = siteLoader('animepahe');
(async () => {
    const searchResults = await search('Naruto');
    const {url: animeURL} = searchResults[0];
    const anime = await getAnime(animeURL);
    const {url: episodeURL} = anime.episodes[0];
    const qualities = await getQualities(episodeURL);
    return qualities;
})().then(result => console.log(result));

```

###CLI
Using the command line
```
anigrab naruto -e 1,90,100:150 -w
```
This will write episodes 1, 90 and 100 to 150 to a file named anime.txt in the current working directory
