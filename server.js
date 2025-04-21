const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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

async function scrapeEbay(query, maxPages = 2) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    let allProducts = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= maxPages) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=0&_pgn=${currentPage}`;
        console.log(`Scraping page ${currentPage} for: ${query}`);

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
    return allProducts;
}

app.get("/api/scrape", async (req, res) => {
    try {
        const query = req.query.q || "nike"; // Default query nike
        const maxPages = parseInt(req.query.pages) || 2; // Default 2 page

        const products = await scrapeEbay(query, maxPages);
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error scraping eBay", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
