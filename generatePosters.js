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
        width: 500,
        height: 750
    });



    const html = `
    <!DOCTYPE html>

    <html>

    <head>
        <style>
        ${css}
        </style>    
    </head>


    <body>


        <div class="poster">


            <img
                class="background"
                src="${item.backdrop || item.tmdbPoster}"
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
            `image/${item.id.replace("tmdb:", "")}.png`

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