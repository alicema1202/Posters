const fs = require("fs");
const puppeteer = require("puppeteer");
const css = fs.readFileSync("posterStyle.css", "utf8");

const catalogs = [
    "catalog/movie/movieCatalog.json",
    "catalog/series/seriesCatalog.json"
];



async function generatePoster(item, browser) {

    const page = await browser.newPage();


    await page.setViewport({
        width: 640,
        height: 360
    });


    const html = `
    <!DOCTYPE html>

    <html>

    <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
        <style>
        ${css}
        </style>    
    </head>


    <body>


        <div class="landscape-poster">


            <img
                class="background"
                src="${item.HDPoster || item.background}"
            />



            <div class="overlay"></div>



            <div class="rank">

                ${item.rank}

            </div>



            ${
                item.logo

                ?

                `
                <img
                    class="logo"
                    src="${item.logo}"
                />
                `

                :

                `
                <div class="title">
                    ${item.name}
                </div>
                `

            }

            ${
                item.HDPoster

                ?

                `
                <img
                    class="logo"
                    src="${item.logo}"
                />
                `

                :

                `
                <img
                    class="fallback logo"
                    src="${item.logo}"
                />
                `

            }
            


            ${
                item.genres && item.genres.length > 0

                ?

                `
                <div class="genre">
                    ${item.genres[0]}
                </div>
                `

                :

                ""

            }


        </div>


    </body>


    </html>
    `;



    await page.setContent(
        html,
        {
            waitUntil: "networkidle0"
        }
    );



    await page.screenshot({

        path:
            `image/landscape${item.id.replace("tmdb:", "")}.png`

    });



    await page.close();



    console.log(
        "Generated:",
        item.name
    );

}




async function main() {


    if (!fs.existsSync("image")) {

        fs.mkdirSync(
            "image",
            {
                recursive:true
            }
        );

    }



    const browser =
        await puppeteer.launch({

            headless: true,

            executablePath:
                "/usr/bin/google-chrome",

            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]

        });




    for (const catalogFile of catalogs) {


        const catalog =
            JSON.parse(
                fs.readFileSync(
                    catalogFile,
                    "utf8"
                )
            );



        for (const item of catalog.metas) {


            await generatePoster(
                item,
                browser
            );


        }


    }




    await browser.close();



    console.log(
        "Finished generating all posters!"
    );

}



main();