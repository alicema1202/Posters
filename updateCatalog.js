const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;


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


    // TMDB release type 4 = Digital
    return usRelease.release_dates.some(
        release => release.type === 4
    );
}



async function getPopularMovies() {

    let movies = [];
    let page = 1;


    while (movies.length < 25) {

        console.log(`Fetching TMDB page ${page}`);


        const response = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
        );


        const data = await response.json();


        if (!data.results) {
            throw new Error(
                "TMDB did not return results"
            );
        }


        for (const movie of data.results) {


            if (movies.length >= 25) {
                break;
            }


            const digital = await hasDigitalRelease(movie.id);


            if (digital) {

                console.log(
                    "Added:",
                    movie.title
                );


                movies.push({
                    id: `tmdb:${movie.id}`,
                    type: "movie",
                    name: movie.title,
                    poster:
                        movie.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : null,
                    background:
                        movie.backdrop_path
                        ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
                        : null
                });

            } else {

                console.log(
                    "Skipped:",
                    movie.title
                );

            }
        }


        page++;


        // Safety limit
        if (page > 10) {
            break;
        }
    }


    return movies;
}



async function updateCatalog() {

    if (!API_KEY) {
        throw new Error(
            "Missing TMDB_KEY"
        );
    }


    const movies = await getPopularMovies();


    const catalog = {
        name: "TMDB Top 25 Digital Movies",
        updated: new Date().toISOString(),
        metas: movies
    };


    fs.writeFileSync(
        "catalog/movie/movieCatalog.json",
        JSON.stringify(
            catalog,
            null,
            2
        )
    );


    console.log(
        `Catalog updated: ${movies.length} movies`
    );
}


updateCatalog();