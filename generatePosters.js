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
            body {
                margin: 0;
                width: 500px;
                height: 750px;
                background: #111;
                font-family: Arial, sans-serif;
                overflow: hidden;
            }

            img {
                width: 500px;
                height: 750px;
                object-fit: cover;
            }

            .title {
                position: absolute;
                bottom: 25px;
                left: 20px;
                right: 20px;

                color: white;
                font-size: 32px;
                font-weight: bold;

                text-shadow:
                    0px 2px 10px black;
            }
        </style>
    </head>

    <body>

        <img src="${item.originalPoster}" />

        <div class="title">
            ${item.name}
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
                recursive: true
            }
        );

    }



    const browser = await puppeteer.launch({

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
                {
                    ...item,

                    // keep original TMDB poster
                    // for rendering
                    originalPoster:
                        `https://image.tmdb.org/t/p/w500${item.id.replace("tmdb:", "")}`
                },

                browser
            );

        }

    }



    await browser.close();


    console.log(
        "All posters generated!"
    );
}


main();