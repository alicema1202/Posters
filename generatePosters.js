const fs = require("fs");
const puppeteer = require("puppeteer");
const { renderGradualBlur } = require("./gradualBlur");
const css = fs.readFileSync("posterStyle.css", "utf8");

const bottomGradualBlur = renderGradualBlur({
    position: "bottom",
    height: "38%",
    strength: 2.5,
    divCount: 6,
    curve: "bezier"
});

const catalogs = [
    "catalog/movie/movieCatalog.json",
    "catalog/series/seriesCatalog.json"
];



const DARK_LOGO_BRIGHTNESS_THRESHOLD = 100;
const LOW_CONTRAST_THRESHOLD = 30;

// For a dark logo, removes its drop-shadow and shortens the dark .overlay
// gradient (the full-size versions boost contrast for a light logo, but
// darkening more of the image would fight a dark one) — unless the logo
// barely contrasts the backdrop directly behind it, in which case the
// shadow/overlay stay since the logo has no other way to stand out.
async function applyDarkLogoAdjustments(page) {

    await page.evaluate((darkThreshold, contrastThreshold) => {

        function averageBrightness(data) {

            let total = 0;
            let count = 0;

            for (let i = 0; i < data.length; i += 4) {

                const alpha = data[i + 3];

                if (alpha === 0) {
                    continue;
                }

                total += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
                count++;

            }

            return count > 0 ? total / count : null;

        }

        const img = Array.from(document.querySelectorAll(".logo")).find(
            (el) =>
                el.complete &&
                el.naturalWidth > 0 &&
                getComputedStyle(el).display !== "none"
        );

        if (!img) {
            return;
        }

        const logoCanvas = document.createElement("canvas");
        logoCanvas.width = img.naturalWidth;
        logoCanvas.height = img.naturalHeight;

        const logoCtx = logoCanvas.getContext("2d");
        logoCtx.drawImage(img, 0, 0);

        let logoBrightness;

        try {
            logoBrightness = averageBrightness(
                logoCtx.getImageData(0, 0, logoCanvas.width, logoCanvas.height).data
            );
        } catch (err) {
            return;
        }

        if (logoBrightness === null || logoBrightness >= darkThreshold) {
            return;
        }

        const background = document.querySelector(".background");

        let backdropBrightness = null;

        if (background) {

            const bgRect = background.getBoundingClientRect();
            const logoRect = img.getBoundingClientRect();

            const bgCanvas = document.createElement("canvas");
            bgCanvas.width = Math.max(1, Math.round(bgRect.width));
            bgCanvas.height = Math.max(1, Math.round(bgRect.height));

            const bgCtx = bgCanvas.getContext("2d");

            try {

                bgCtx.drawImage(background, 0, 0, bgCanvas.width, bgCanvas.height);

                const sx = Math.max(0, Math.round(logoRect.left - bgRect.left));
                const sy = Math.max(0, Math.round(logoRect.top - bgRect.top));
                const sw = Math.min(bgCanvas.width - sx, Math.round(logoRect.width));
                const sh = Math.min(bgCanvas.height - sy, Math.round(logoRect.height));

                if (sw > 0 && sh > 0) {
                    backdropBrightness = averageBrightness(
                        bgCtx.getImageData(sx, sy, sw, sh).data
                    );
                }

            } catch (err) {
                backdropBrightness = null;
            }

        }

        const hasContrast =
            backdropBrightness === null ||
            Math.abs(logoBrightness - backdropBrightness) >= contrastThreshold;

        if (!hasContrast) {
            return;
        }

        img.classList.add("logo-dark");

        const overlay = document.querySelector(".overlay");

        if (overlay) {
            overlay.classList.add("overlay-compact");
        }

    }, DARK_LOGO_BRIGHTNESS_THRESHOLD, LOW_CONTRAST_THRESHOLD);

}



async function generatePoster(item, browser) {

    const page = await browser.newPage();


    await page.setViewport({
        width: 340,
        height: 510
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


        <div class="poster">


            <img
                class="background"
                crossorigin="anonymous"
                src="${item.backdropPoster || item.background}"
            />



            ${bottomGradualBlur}

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
            // `image/${item.id.replace("tmdb:", "")}.png`
            `image/${item.type}-${item.rank}.png`,

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