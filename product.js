const http = require("http");
const puppeteer = require("puppeteer");
const url = require("url");

async function scrapeEbay(query, maxPages = 2) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    let allProducts = [];
    let currentPage = 1;
    let hasNextPage = true;

    function chunkArray(arr, size) {
        const result = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    }

    const MAX_CONCURRENT = 5; // Maximum tab paralel

    while (hasNextPage && currentPage <= maxPages) {
        const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=0&_pgn=${currentPage}`;
        console.log(`Scraping page ${currentPage} for: ${query}`);

        await page.goto(ebayUrl, { waitUntil: "domcontentloaded" });

        const products = await page.evaluate(() => {
            let items = [];
            document.querySelectorAll(".s-item").forEach(item => {
                let title = item.querySelector(".s-item__title")?.innerText || "-";
                let price = item.querySelector(".s-item__price")?.innerText || "-";
                let link = item.querySelector(".s-item__link")?.href || "-";

                if (title !== "-" && link !== "-") {
                    items.push({ title, price, link });
                }
            });
            return items;
        });

        const productBatches = chunkArray(products, MAX_CONCURRENT);

        for (const batch of productBatches) {
            await Promise.allSettled(
                batch.map(async (product) => {
                    product.description = await scrapeDescription(browser, product.link);
                })
            );
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


async function scrapeDescription(browser, productUrl) {
    const page = await browser.newPage();

    try {
        await page.goto(productUrl, { waitUntil: "domcontentloaded" });

        let description = await page.evaluate(() => {
            return document.querySelector("#viTabs_0_is")?.innerText ||
                document.querySelector(".item-desc")?.innerText ||
                "-";
        });

        await page.close();
        return description;
    } catch (error) {
        console.error(`Gagal mengambil deskripsi dari: ${productUrl}`);
        await page.close();
        return "-";
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === "/api/scrape") {
        const query = parsedUrl.query.q || "nike"; // Default query "nike"
        const maxPages = parseInt(parsedUrl.query.pages) || 2; // Default 2 pages

        try {
            const products = await scrapeEbay(query, maxPages);
            res.writeHead(200, { "Content-Type": "application/json" });
            const cleanProducts = products.map(p => ({
                Name: p.title,
                Price: p.price,
                Description: p.description
            }));
            res.end(JSON.stringify({ success: true, data: cleanProducts }));

        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "Error scraping eBay", error: error.message }));
        }
    } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "Endpoint not found" }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
