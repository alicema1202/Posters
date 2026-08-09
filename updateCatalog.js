const fs = require("fs");

const API_KEY = process.env.TMDB_KEY;
const OMDB_KEY = process.env.OMDB_KEY;
const MDBLIST_KEY = process.env.MDBLIST_KEY;
const GITHUB_PAGES =
    "https://posters-rank.vercel.app/image";

const BUILD_TIMESTAMP = Date.now();

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
        `https://api.themoviedb.org/3/${type}/${id}/images?api_key=${API_KEY}`
    );

    const data = await response.json();

    const cleanBackdrops =
        (data.backdrops || [])
            .filter(image => image.iso_639_1 === null);

    // Best backdrop for poster generation
    const backdrop =
        [...cleanBackdrops]
            .sort((a, b) => b.vote_average - a.vote_average)[0];
    // highest quality backdrop
    // const HDPoster =
    //     [...cleanBackdrops]
    //         .sort((a, b) => b.width - a.width)[0];

    const HDPoster =
        (data.backdrops || [])
            .filter(image => image.iso_639_1 === "en")
            .sort((a, b) => b.vote_average - a.vote_average)[0];
    // clean posters
    const backdropPoster = data.posters
        .filter(image => image.iso_639_1 === null)
        .sort((a, b) => b.vote_average - a.vote_average)[0];

    const logo =
        data.logos
            ?.sort((a, b) => {
                const aEnglish = a.iso_639_1 === "en" ? 1 : 0;
                const bEnglish = b.iso_639_1 === "en" ? 1 : 0;

                if (aEnglish !== bEnglish) {
                    return bEnglish - aEnglish;
                }

                return b.vote_average - a.vote_average;
            })[0];

    return {

        backdrop:
            backdrop?.file_path
                ? `https://image.tmdb.org/t/p/original${backdrop.file_path}`
                : null,

        backdropPoster:
            backdropPoster?.file_path
                ? `https://image.tmdb.org/t/p/original${backdropPoster.file_path}`
                : null,

        logo:
            logo?.file_path
                ? `https://image.tmdb.org/t/p/w500${logo.file_path}`
                : null,
        HDPoster:
            HDPoster?.file_path
                ? `https://image.tmdb.org/t/p/original${HDPoster.file_path}`
                : null,
    };
}
async function getIMDbId(type, id) {

    const response = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${API_KEY}`
    );

    const data = await response.json();

    return data.imdb_id ?? null;

}
async function getIMDBRating(imdbId) {

    const response = await fetch(
        `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const imdb = data.imdbRating;

    return imdb ?? null;
}
async function getIMDBRating2(type, tmdbID) {
    const response = await fetch(
        `https://api.mdblist.com/rating/${type}/imdb?apikey=${MDBLIST_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ids: [tmdbID],
                provider: "tmdb"
            })
        }
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log(data);

    return data.ratings[0]?.rating ?? null;
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

    const isAnime =
        data.origin_country?.includes("JP") &&
        data.genres?.some(
            genre => genre.id === 16
        );

    const isDocumentary =
        data.genres?.some(
            genre => genre.id === 99
        );

    return isAnime || isDocumentary;
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
        "live event",
        "documentary"
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
        const imdbId = await getIMDbId("movie", movie.id);
        // const imdbRating = await getIMDBRating(imdbId);
        const imdbRating = await getIMDBRating2("movie", movie.id);
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
                imdbId,

            type:
                "movie",

            name:
                movie.title,

            description:
                movie.overview,

            rank:
                movies.length + 1,


            genres:
                getGenres(
                    "movie",
                    movie.genre_ids
                ),

            imdbRating: imdbRating,
            imdbId: imdbId,
            poster:
                // `${GITHUB_PAGES}/${imdbId}.png?v=${BUILD_TIMESTAMP}`,
                `${GITHUB_PAGES}/${series.length + 1}.png?v=${BUILD_TIMESTAMP}`,


            tmdbPoster:
                movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : null,

            HDPoster:
                images.HDPoster,
            background:
                images.backdrop,

            backdropPoster: 
                images.backdropPoster,
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
        const imdbId = await getIMDbId("tv", show.id);
        const imdbRating = await getIMDBRating2("show", show.id);
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
                imdbId,

            type:
                "series",

            name:
                show.name,

            description:
                show.overview,

            rank:
                series.length + 1,

            imdbRating: imdbRating,
            imdbId: imdbId,
            genres:
                getGenres(
                    "tv",
                    show.genre_ids
                ),


            poster:
                // `${GITHUB_PAGES}/${imdbId}.png?v=${BUILD_TIMESTAMP}`,
                `${GITHUB_PAGES}/${series.length + 1}.png?v=${BUILD_TIMESTAMP}`,

            HDPoster:
                images.HDPoster,
            tmdbPoster:
                show.poster_path
                    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                    : null,


            background:
                images.backdrop,

            backdropPoster:
                images.backdropPoster,

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
function saveCatalog(path, name, metas, posterShape = "portrait") {
    const directory =
        path.substring(
            0,
            path.lastIndexOf("/")
        );

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        });
    }

    metas = metas.map(meta => ({
        ...meta,
        posterShape
    }));

    if (posterShape === "landscape") {
        metas = metas.map(meta => ({
            ...meta,
            // poster: `${GITHUB_PAGES}/landscape${meta.imdbId}.png?v=${BUILD_TIMESTAMP}`
            poster: `${GITHUB_PAGES}/landscape${meta}.png?v=${BUILD_TIMESTAMP}`
        }));
    }

    fs.writeFileSync(
        path,
        JSON.stringify(
            {
                name,
                updated: new Date().toISOString(),
                metas
            },
            null,
            2
        )
    );

    console.log("Saved:", path);
}
function saveLandscapeCatalog(path, name, metas) {
    const directory = path.substring(
        0,
        path.lastIndexOf("/")
    );

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        });
    }

    metas = metas.map(meta => {
        const { logo, ...rest } = meta;

        return {
            ...rest,
            // poster: `${GITHUB_PAGES}/${meta.imdbId}.png?v=${BUILD_TIMESTAMP}`,
            poster: `${GITHUB_PAGES}/${meta.rank}.png?v=${BUILD_TIMESTAMP}`,
            // background: `${GITHUB_PAGES}/landscape${meta.imdbId}.png?v=${BUILD_TIMESTAMP}`
            background: `${GITHUB_PAGES}/landscape${meta.rank}.png?v=${BUILD_TIMESTAMP}`
        };
    });

    fs.writeFileSync(
        path,
        JSON.stringify(
            {
                name,
                updated: new Date().toISOString(),
                metas
            },
            null,
            2
        )
    );

    console.log("Saved landscape:", path);
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
        movies,
        "portrait"
    );

    saveCatalog(
        "landscape/catalog/movie/movieCatalog-landscape.json",
        "TMDB Top 10 Movies Today",
        movies,
        "landscape"
    );

    saveCatalog(
        "catalog/series/seriesCatalog.json",
        "TMDB Top 10 Series Today",
        series,
        "portrait"
    );

    saveCatalog(
        "landscape/catalog/series/seriesCatalog-landscape.json",
        "TMDB Top 10 Series Today",
        series,
        "landscape"
    );
    saveLandscapeCatalog(
        "posters-only/catalog/series/series-posters.json",
        "TMDB Top 10 Series Today",
        series,
        "landscape"
    );
    saveLandscapeCatalog(
        "posters-only/catalog/movie/movies-posters.json",
        "TMDB Top 10 Movies Today",
        movies,
        "landscape"
    );


    console.log(
        "All catalogs updated!"
    );

}



updateCatalog();