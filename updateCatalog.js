const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;

const GITHUB_PAGES =
    "https://alicema1202.github.io/Posters/image";


async function getImages(type, id) {

    const response = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/images?api_key=${API_KEY}&include_image_language=en,null`
    );

    const data = await response.json();


    return {

        backdrop:
            data.backdrops?.[0]?.file_path
                ? `https://image.tmdb.org/t/p/w1280${data.backdrops[0].file_path}`
                : null,


        logo:
            data.logos?.[0]?.file_path
                ? `https://image.tmdb.org/t/p/w500${data.logos[0].file_path}`
                : null

    };
}


/**
 * Check if movie has US digital release
 */
async function hasDigitalRelease(movieId) {

    const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/release_dates?api_key=${API_KEY}`
    );


    const data = await response.json();


    const usRelease = data.results?.find(
        country => country.iso_3166_1 === "US"
    );


    if (!usRelease) {
        return false;
    }


    return usRelease.release_dates.some(
        release => release.type === 4
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
            genre => genre.id === 16
        )
    );
}



/**
 * Top 10 Movies
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
            continue;
        }


        if (!(await hasDigitalRelease(movie.id))) {
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
            "Movie added:",
            movie.title
        );
    }


    return movies;
}



/**
 * Top 10 Series
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
            continue;
        }


        if (!(await hasUSAvailability(show.id))) {
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
            "Series added:",
            show.name
        );
    }


    return series;
}



/**
 * Save JSON
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
                recursive:true
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
 * Run
 */
async function updateCatalog() {

    if (!API_KEY) {
        throw new Error(
            "Missing TMDB_KEY"
        );
    }


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