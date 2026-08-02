const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;


/**
 * Check if a movie has a US digital release
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
 * Get top 25 digital movies
 */
async function getTopMovies() {

    const movies = [];
    let page = 1;


    while (movies.length < 25) {

        console.log(`Fetching movie page ${page}`);


        const response = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
        );


        const data = await response.json();


        for (const movie of data.results) {

            if (movies.length >= 25) {
                break;
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

            }

        }


        page++;

        if (page > 10) break;
    }


    return movies;
}



/**
 * Get top 25 TV series
 */
async function getTopSeries() {

    const series = [];
    let page = 1;


    while (series.length < 25) {

        console.log(`Fetching series page ${page}`);


        const response = await fetch(
            `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
        );


        const data = await response.json();


        if (!data.results) {
            throw new Error("TMDB TV returned no results");
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


        page++;

        if (page > 10) break;
    }


    return series;
}



/**
 * Write JSON file
 */
function saveCatalog(path, name, metas) {

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
        `Saved ${path}`
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


    saveCatalog(
        "catalog/movie/movieCatalog.json",
        "TMDB Top 25 Movies",
        movies
    );


    saveCatalog(
        "catalog/series/seriesCatalog.json",
        "TMDB Top 25 Series",
        series
    );


    console.log("All catalogs updated!");
}


updateCatalog();