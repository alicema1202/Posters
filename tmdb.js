const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: process.env.TMDB_KEY
  }
};

fetch(`https://api.themoviedb.org/3/trending/movie/day`, options)
    .then(res => res.json())
    .then(res => {
        document.getElementById("list").innerHTML = res.results.map(movie => `${movie.title} (TMDB ID: ${movie.id})`).join("<br>");
    })

function getPoster() {
    // get the tmdb id that was inputted
    // put this into a const
    const tmdbId = document.getElementById("tmdbId").value;
    
    // make the API call
    fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images`, options)
        .then(res => res.json())
        .then(res => {
            const posterPath = res?.backdrops[0]?.file_path;
            if (posterPath) {
                document.getElementById("poster").src = `https://image.tmdb.org/t/p/original${posterPath}`;
            }
        })
        .catch(err => console.error(err));
}