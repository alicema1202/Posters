const fs = require("fs");
const puppeteer = require("puppeteer");
const css = fs.readFileSync("posterStyle.css", "utf8");

const catalogs = [
    "catalog/movie/movieCatalog.json",
    "catalog/series/seriesCatalog.json"
];



const DARK_LOGO_BRIGHTNESS_THRESHOLD = 100;

// For a dark logo, removes its drop-shadow and shortens the dark .overlay
// gradient (the full-size versions boost contrast for a light logo, but
// darkening more of the image would fight a dark one).
async function applyDarkLogoAdjustments(page) {

    await page.evaluate((threshold) => {

        const img = Array.from(document.querySelectorAll(".logo")).find(
            (el) =>
                el.complete &&
                el.naturalWidth > 0 &&
                getComputedStyle(el).display !== "none"
        );

        if (!img) {
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        let data;

        try {
            data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        } catch (err) {
            return;
        }

        let total = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {

            const alpha = data[i + 3];

            if (alpha === 0) {
                continue;
            }

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            total += (r * 299 + g * 587 + b * 114) / 1000;
            count++;

        }

        if (count === 0 || total / count >= threshold) {
            return;
        }

        img.classList.add("logo-dark");

        const overlay = document.querySelector(".overlay");

        if (overlay) {
            overlay.classList.add("overlay-compact");
        }

    }, DARK_LOGO_BRIGHTNESS_THRESHOLD);

}



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
                    crossorigin="anonymous"
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
                    crossorigin="anonymous"
                    src="${item.logo}"
                />
                `

                :

                `
                <img
                    class="fallback logo"
                    crossorigin="anonymous"
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



    if (item.logo) {

        await applyDarkLogoAdjustments(page);

    }



    await page.screenshot({

        path:
            // `image/landscape${item.id.replace("tmdb:", "")}.png`
            `image/${item.type}-landscape${item.rank}.png`

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