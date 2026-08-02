const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;


/**
 * Check if movie has a US digital release
 * TMDB release type 4 = Digital
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
 * Check if TV show has US availability
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

    const endpoint =
        type === "movie"
            ? "movie"
            : "tv";


    const response = await fetch(
        `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${API_KEY}`
    );


    const data = await response.json();


    const isJapanese =
        data.origin_country?.includes("JP");


    const isAnimation =
        data.genres?.some(
            genre => genre.id === 16
        );


    return isJapanese && isAnimation;
}



/**
 * Get top 10 movies today
 */
async function getTopMovies() {

    const movies = [];


    const response = await fetch(
        `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`
    );


    const data = await response.json();


    if (!data.results) {
        throw new Error(
            "TMDB movies returned no results"
        );
    }


    for (const movie of data.results) {

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


        if (await hasDigitalRelease(movie.id)) {

            console.log(
                "Movie added:",
                movie.title
            );


            movies.push({
                id: `tmdb:${movie.id}`,
                type: "movie",
                name: movie.title,
                poster: movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : null,
                background: movie.backdrop_path
                    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
                    : null
            });

        } else {

            console.log(
                "Movie skipped (no digital):",
                movie.title
            );

        }
    }


    return movies;
}



/**
 * Get top 10 series today
 */
async function getTopSeries() {

    const series = [];


    const response = await fetch(
        `https://api.themoviedb.org/3/trending/tv/day?api_key=${API_KEY}`
    );


    const data = await response.json();


    if (!data.results) {
        throw new Error(
            "TMDB series returned no results"
        );
    }


    for (const show of data.results) {

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


        if (await hasUSAvailability(show.id)) {

            console.log(
                "Series added:",
                show.name
            );


            series.push({
                id: `tmdb:${show.id}`,
                type: "series",
                name: show.name,
                poster: show.poster_path
                    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                    : null,
                background: show.backdrop_path
                    ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
                    : null
            });

        } else {

            console.log(
                "Series skipped (no US availability):",
                show.name
            );

        }
    }


    return series;
}



/**
 * Save catalog file
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


    const catalog = {
        name,
        updated: new Date().toISOString(),
        metas
    };


    fs.writeFileSync(
        path,
        JSON.stringify(
            catalog,
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


    const movies = await getTopMovies();

    const series = await getTopSeries();


    console.log(
        `Movies: ${movies.length}`
    );

    console.log(
        `Series: ${series.length}`
    );


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