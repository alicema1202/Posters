const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;
console.log(API_KEY ? "API key loaded" : "Missing key");
const data = await response.json();

console.log("TMDB response:");
console.log(JSON.stringify(data, null, 2));
async function updateCatalog() {

    if (!API_KEY) {
        throw new Error("Missing TMDB_KEY");
    }


    const response = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`
    );


    const data = await response.json();


    const movies = data.results
        .slice(0, 25)
        .map(movie => ({
            id: `tmdb:${movie.id}`,
            type: "movie",
            name: movie.title,
            poster:
              `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
            background:
              `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
        }));


    const catalog = {
        id: "tmdb-top25",
        name: "TMDB Top 25 Movies",
        updated: new Date().toISOString(),
        metas: movies
    };


    fs.writeFileSync(
        "catalog/movieCatalog.json",
        JSON.stringify(catalog, null, 2)
    );

    console.log("Catalog updated!");
}


updateCatalog();