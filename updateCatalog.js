const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;


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


    // TMDB type 4 = Digital
    return usRelease.release_dates.some(
        release => release.type === 4
    );
}



/**
 * Get top 25 trending movies today
 * Only include movies digitally released in US
 */
async function getTopMovies() {

    const movies = [];


    const response = await fetch(
        `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`
    );


    const data = await response.json();


    if (!data.results) {
        throw new Error("TMDB movies returned no results");
    }


    for (const movie of data.results) {

        if (movies.length >= 25) {
            break;
        }


        const digital = await hasDigitalRelease(movie.id);


        if (digital) {

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
                "Movie skipped:",
                movie.title
            );

        }
    }


    return movies;
}



/**
 * Get top 25 trending TV series today
 */
async function getTopSeries() {

    const series = [];


    const response = await fetch(
        `https://api.themoviedb.org/3/trending/tv/day?api_key=${API_KEY}`
    );


    const data = await response.json();


    if (!data.results) {
        throw new Error("TMDB series returned no results");
    }


    for (const show of data.results) {

        if (series.length >= 25) {
            break;
        }


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
    }


    return series;
}



/**
 * Save catalog JSON
 */
function saveCatalog(filePath, name, metas) {

    const directory = filePath.substring(
        0,
        filePath.lastIndexOf("/")
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
        filePath,
        JSON.stringify(
            catalog,
            null,
            2
        )
    );


    console.log(
        "Saved:",
        filePath
    );
}



/**
 * Main
 */
async function updateCatalog() {

    if (!API_KEY) {
        throw new Error("Missing TMDB_KEY");
    }


    const movies = await getTopMovies();

    const series = await getTopSeries();


    console.log(
        "Movie count:",
        movies.length
    );


    console.log(
        "Series count:",
        series.length
    );


    saveCatalog(
        "catalog/movie/movieCatalog.json",
        "TMDB Top 25 Movies Today",
        movies
    );


    saveCatalog(
        "catalog/series/seriesCatalog.json",
        "TMDB Top 25 Series Today",
        series
    );


    console.log(
        "All catalogs updated!"
    );
}


updateCatalog();