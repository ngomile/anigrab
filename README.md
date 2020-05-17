# anigrab

Fast and efficient anime downloader that gets the episodes you need very quickly, saving you your precious time and energy. Taking inspiration from [anime-downloader](https://github.com/vn-ki/anime-downloader)

## Supported Sites
* animeidhentai
* animekisa
* animeout
* animepahe
* gogoanime
* hentaihaven
* ryuanime

## Installation
You must have nodejs and npm installed on your computer, preferably the more current versions. Type this into your commandline.
```
npm install -g anigrab
```
And you should be ready to get started using anigrab

## Usage

### Downloading
Downloading an anime is as simple as typing in the name of an anime which initiates a search for the anime. Ensure you have aria2c installed which is what is used for downloading otherwise downloading will not work. For example:

```
anigrab beastars -e 10
```

This will make anigrab download episode 10 of Beastars from animepahe by default, to specify a site you can use the -s flag

```
anigrab beastars -e 10 -s gogoanime
```

This will download Beastars episode 10 from gogoanime. If you want to get a little more specific in the episodes of the anime you want you can do this:

```
anigrab beastars -e 1,5,10:12
```

This may look complicated at first but it basically means this will download episodes 1, 5, 10, 11 and 12 of the anime Beastars. Giving the direct link of the anime works as well:

```
anigrab "https://www18.gogoanime.io/category/black-clover-tv"
```

Will download Black Clover from gogoanime

### Command Line Options
You can specify some command line flags that affect the behavior of anigrab, these are:
```
--help                          shows this help message

-q, --quality                   quality of the video, can be 720p or 1080p or any other resolution

-e, --episodes                  episodes to get for example "1,2,5:10"

-w, --write                     writes stream urls by appending them to a file named anime.txt in current working directory

-s, --site                      the site to get the anime from, choose animepahe, gogoanime etc.

-u, --url                       prints stream url of episode

--fb, --fallback                comma separated string of qualities to choose if quality asked for is not found e.g 360p, 480p

-d, --directory                 the directory to download the file to

--sk, --skip                    skips downloading the file

--xd, --external-downloader     the external downloader to use to download the file, aria2c by default and currently aria2c only supported

--ft, --filter-title            regular expression to filter episodes based on their titles
```

### Usage as Library
anigrab has useful functions that try to intuitively fetch the information of an anime. Each file that handles a site contains three functions it exports which are search, getAnime and getQualities. Usage is as imple as

#### Search, Get Anime and Get Qualities
```javascript
const { search, getAnime, getQualities } = require('anigrab').sites.siteLoader('animeout');

async function main() {
    const searchResults = await search('naruto'); // Initiates a search for Naruto, this is a promise so can be awaited
    const { url } = searchResults[0]; // Use destructuring to get url of search result at index 0
    const anime = await getAnime(url); // Retrieves the title of the anime and it's episodes, again this is awaitable
    const episodeURL = anime.episodes[0].url // Episode objects contain their url, here we access the url of the episode at index 0 of the episode list
    const qualities = await getQualities(episodeURL); // This retrieves the available qualities of the episode as a map of qualities pointing to an object with the server that is host and the referer to use
    console.log(qualities);
}

main()
```