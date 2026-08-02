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
    <html>
    <body style="
        margin:0;
        width:500px;
        height:750px;
        background:#111;
        color:white;
        font-family:Arial;
    ">

        <img 
            src="${item.originalPoster}"
            style="
                width:100%;
                height:100%;
                object-fit:cover;
            "
        />

        <div style="
            position:absolute;
            bottom:30px;
            left:20px;
            right:20px;
            font-size:32px;
            font-weight:bold;
            text-shadow:0 2px 10px black;
        ">
            ${item.name}
        </div>

    </body>
    </html>
    `;


    await page.setContent(html, {
        waitUntil: "networkidle0"
    });


    await page.screenshot({
        path:`image/${item.id.replace("tmdb:", "")}.png`
    });


    await page.close();
}



async function main() {

    if (!fs.existsSync("image")) {
        fs.mkdirSync("image");
    }


    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"]
    });


    for (const file of catalogs) {

        const data = JSON.parse(
            fs.readFileSync(file)
        );


        for (const item of data.metas) {

            console.log(
                "Generating:",
                item.name
            );


            await generatePoster(
                item,
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