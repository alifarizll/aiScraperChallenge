const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");

async function getProductDescription(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let description = $("#viTabs_0_is").text().trim();
        if (!description) description = "-";

        return description;
    } catch (error) {
        console.error("Error fetching product description:", error.message);
        return "-";
    }
}

async function scrapeEbay() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    let allProducts = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        const url = `https://www.ebay.com/sch/i.html?_from=R40&_nkw=nike&_sacat=0&rt=nc&_pgn=${currentPage}`;
        console.log(`Scraping page ${currentPage}...`);

        await page.goto(url, { waitUntil: "domcontentloaded" });

        const products = await page.evaluate(() => {
            let items = [];
            document.querySelectorAll(".s-item").forEach(item => {
                let title = item.querySelector(".s-item__title")?.innerText || "-";
                let price = item.querySelector(".s-item__price")?.innerText || "-";
                let link = item.querySelector(".s-item__link")?.href || "-";

                if (title !== "-") {
                    items.push({ title, price, link });
                }
            });
            return items;
        });

        for (let product of products) {
            if (product.link !== "-") {
                product.description = await getProductDescription(product.link);
            } else {
                product.description = "-";
            }
        }

        allProducts.push(...products);

        hasNextPage = await page.evaluate(() => {
            let nextButton = document.querySelector(".pagination__next");
            return nextButton && !nextButton.classList.contains("pagination__next--disabled");
        });

        currentPage++;
    }

    await browser.close();

    console.log(JSON.stringify(allProducts, null, 2));
}

scrapeEbay();
