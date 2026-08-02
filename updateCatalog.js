const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;

const GITHUB_PAGES =
    "https://alicema1202.github.io/Posters/image";


let movieGenres = {};
let tvGenres = {};



/**
 * Load TMDB genre mappings
 */
async function loadGenres() {

    const movieResponse = await fetch(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`
    );

    const movieData = await movieResponse.json();


    movieData.genres?.forEach(genre => {
        movieGenres[genre.id] = genre.name;
    });



    const tvResponse = await fetch(
        `https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}`
    );


    const tvData = await tvResponse.json();


    tvData.genres?.forEach(genre => {
        tvGenres[genre.id] = genre.name;
    });

}



/**
 * Convert genre IDs to names
 */
function getGenres(type, genreIds) {

    const map =
        type === "movie"
            ? movieGenres
            : tvGenres;


    return genreIds
        ?.map(id => map[id])
        .filter(Boolean)
        || [];

}



/**
 * Get clean backdrop + logo
 */
async function getImages(type, id) {

    const response = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/images?api_key=${API_KEY}&include_image_language=en,null`
    );


    const data = await response.json();



    const backdrop =
        data.backdrops
            ?.filter(
                image =>
                    image.iso_639_1 === null
            )
            ?.sort(
                (a, b) =>
                    b.vote_average - a.vote_average
            )[0];



    const logo =
        data.logos
            ?.filter(
                image =>
                    image.iso_639_1 === "en" ||
                    image.iso_639_1 === null
            )
            ?.sort(
                (a, b) =>
                    b.vote_average - a.vote_average
            )[0];



    return {

        backdrop:
            backdrop?.file_path
                ? `https://image.tmdb.org/t/p/w1280${backdrop.file_path}`
                : null,


        logo:
            logo?.file_path
                ? `https://image.tmdb.org/t/p/w500${logo.file_path}`
                : null

    };

}



/**
 * Check movie digital release
 * TMDB release type 4 = Digital
 */
async function hasDigitalRelease(movieId) {

    const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/release_dates?api_key=${API_KEY}`
    );


    const data = await response.json();


    const usRelease =
        data.results?.find(
            country =>
                country.iso_3166_1 === "US"
        );


    if (!usRelease) {
        return false;
    }


    return usRelease.release_dates.some(
        release =>
            release.type === 4
    );

}



/**
 * Check TV US availability
 */
async function hasUSAvailability(showId) {

    const response = await fetch(
        `https://api.themoviedb.org/3/tv/${showId}/watch/providers?api_key=${API_KEY}`
    );


    const data = await response.json();


    return !!data.results?.US;

}



/**
 * Exclude anime
 */
async function isAnime(type, id) {

    const response = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}`
    );


    const data = await response.json();


    return (
        data.origin_country?.includes("JP") &&
        data.genres?.some(
            genre =>
                genre.id === 16
        )
    );

}



/**
 * Exclude sports/live events
 */
async function isSportsEvent(type, id, title) {

    const response = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}&append_to_response=keywords`
    );


    const data = await response.json();


    const blockedWords = [
        "wwe",
        "wwf",
        "ufc",
        "aew",
        "wrestling",
        "boxing",
        "mma",
        "nfl",
        "nba",
        "nhl",
        "super bowl",
        "world cup",
        "formula 1",
        "f1",
        "nascar",
        "motogp",
        "live event"
    ];



    const lowerTitle =
        title.toLowerCase();



    const titleMatch =
        blockedWords.some(
            word =>
                lowerTitle.includes(word)
        );



    const keywordMatch =
        data.keywords?.keywords?.some(
            keyword =>
                blockedWords.some(
                    word =>
                        keyword.name
                            .toLowerCase()
                            .includes(word)
                )
        );



    return (
        titleMatch ||
        keywordMatch
    );

}



/**
 * Get top movies
 */
async function getTopMovies() {

    const movies = [];


    const response = await fetch(
        `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`
    );


    const data = await response.json();



    for (const movie of data.results || []) {


        if (movies.length >= 10) {
            break;
        }



        if (await isAnime("movie", movie.id)) {

            console.log(
                "Movie skipped (anime):",
                movie.title
            );

            continue;

        }



        if (
            await isSportsEvent(
                "movie",
                movie.id,
                movie.title
            )
        ) {

            console.log(
                "Movie skipped (sports event):",
                movie.title
            );

            continue;

        }



        if (!(await hasDigitalRelease(movie.id))) {

            console.log(
                "Movie skipped (no digital):",
                movie.title
            );

            continue;

        }



        const images =
            await getImages(
                "movie",
                movie.id
            );



        movies.push({

            id:
                `tmdb:${movie.id}`,

            type:
                "movie",

            name:
                movie.title,


            rank:
                movies.length + 1,


            genres:
                getGenres(
                    "movie",
                    movie.genre_ids
                ),


            poster:
                `${GITHUB_PAGES}/${movie.id}.png`,


            tmdbPoster:
                movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : null,


            backdrop:
                images.backdrop,


            logo:
                images.logo

        });



        console.log(
            `Movie #${movies.length}:`,
            movie.title
        );

    }


    return movies;

}



/**
 * Get top series
 */
async function getTopSeries() {

    const series = [];


    const response = await fetch(
        `https://api.themoviedb.org/3/trending/tv/day?api_key=${API_KEY}`
    );


    const data = await response.json();



    for (const show of data.results || []) {


        if (series.length >= 10) {
            break;
        }



        if (await isAnime("tv", show.id)) {

            console.log(
                "Series skipped (anime):",
                show.name
            );

            continue;

        }



        if (
            await isSportsEvent(
                "tv",
                show.id,
                show.name
            )
        ) {

            console.log(
                "Series skipped (sports event):",
                show.name
            );

            continue;

        }



        if (!(await hasUSAvailability(show.id))) {

            console.log(
                "Series skipped (no US):",
                show.name
            );

            continue;

        }



        const images =
            await getImages(
                "tv",
                show.id
            );



        series.push({

            id:
                `tmdb:${show.id}`,

            type:
                "series",

            name:
                show.name,


            rank:
                series.length + 1,


            genres:
                getGenres(
                    "tv",
                    show.genre_ids
                ),


            poster:
                `${GITHUB_PAGES}/${show.id}.png`,


            tmdbPoster:
                show.poster_path
                    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                    : null,


            backdrop:
                images.backdrop,


            logo:
                images.logo

        });



        console.log(
            `Series #${series.length}:`,
            show.name
        );

    }


    return series;

}



/**
 * Save catalog
 */
function saveCatalog(path, name, metas) {

    const directory =
        path.substring(
            0,
            path.lastIndexOf("/")
        );


    if (!fs.existsSync(directory)) {

        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );

    }



    fs.writeFileSync(
        path,
        JSON.stringify(
            {
                name,
                updated:
                    new Date().toISOString(),
                metas
            },
            null,
            2
        )
    );


    console.log(
        "Saved:",
        path
    );

}



/**
 * Main
 */
async function updateCatalog() {


    if (!API_KEY) {

        throw new Error(
            "Missing TMDB_KEY"
        );

    }



    await loadGenres();



    const movies =
        await getTopMovies();



    const series =
        await getTopSeries();



    saveCatalog(
        "catalog/movie/movieCatalog.json",
        "TMDB Top 10 Movies Today",
        movies
    );



    saveCatalog(
        "catalog/series/seriesCatalog.json",
        "TMDB Top 10 Series Today",
        series
    );



    console.log(
        "All catalogs updated!"
    );

}



updateCatalog();