const fs = require("fs");
const puppeteer = require("puppeteer");


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

            html, body {

                margin: 0;

                padding: 0;

                width: 500px;

                height: 750px;

                overflow: hidden;

                background: black;

                font-family: Arial, sans-serif;

            }



            .poster {

                position: relative;

                width: 500px;

                height: 750px;

            }



            .background {

                position: absolute;

                width: 100%;

                height: 100%;

                object-fit: cover;

            }



            .overlay {

                position: absolute;

                width: 100%;

                height: 100%;

                background:
                    linear-gradient(
                        to top,
                        rgba(0,0,0,0.9),
                        rgba(0,0,0,0.2) 65%
                    );

            }



            .rank {

                position: absolute;

                top: 30px;

                left: 30px;

                // background: rgba(0,0,0,0.75);

                color: white;

                // padding: 8px 16px;

                border-radius: 12px;

                font-size: 100px;

                font-weight: bold;

                text-shadow:
                    0 2px 8px black;

            }



            .logo {

                position: absolute;

                bottom: 80px;

                left: 50%;

                transform:
                    translateX(-50%);

                width: 85%;

                max-height: 180px;

                object-fit: contain;

            }



            .title {

                position: absolute;

                bottom: 90px;

                left: 25px;

                right: 25px;

                text-align: center;

                color: white;

                font-size: 40px;

                font-weight: bold;

                text-shadow:
                    0 3px 12px black;

            }


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