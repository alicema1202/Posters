const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;


async function updateCatalog() {

    if (!API_KEY) {
        throw new Error("Missing TMDB_KEY");
    }


    const response = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`
    );


    console.log("Status:", response.status);


    const data = await response.json();

    console.log(JSON.stringify(data, null, 2));


    if (!data.results) {
        throw new Error("TMDB did not return results");
    }


    const movies = data.results
        .slice(0, 25)
        .map(movie => ({
            id: `tmdb:${movie.id}`,
            type: "movie",
            name: movie.title,
            poster:
                `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        }));


    const catalog = {
        name: "TMDB Top 25 Movies",
        updated: new Date().toISOString(),
        metas: movies
    };


    fs.writeFileSync(
        "catalog/movie/movieCatalog.json",
        JSON.stringify(catalog, null, 2)
    );


    console.log("Catalog updated!");
}


updateCatalog();