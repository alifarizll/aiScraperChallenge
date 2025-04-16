#aiScraperChallenge

A lightweight web scraping API using Node.js and Puppeteer, designed to extract product data from eBay listings.

This project is aimed at completing the Ai Scraper Challenge.

🛠 Requirements

Node.js v18+

Internet connection (for live scraping)

🚀 Getting Started

To run this project, you can follow the code below 

npm install

node product.js

server will running on "http://localhost:3000"

To see the scraped item, we can use postman or hoppscotch with the url below: 

http://localhost:3000/api/scrape?q=asics&pages=4

which means : 

q=[brand or item you want to see] // for example nike, adidas etc
pages=[how much page you want to see] // for example 4

wait for a while, and the product list will appear in json format.

example response : 

{
  "success": true,
  "data": [
    {
      "Name": "Nike Air Max 270",
      "Price": "$120.00",
      "Description": "These Nike shoes offer maximum comfort and style..."
    },
    {
      "Name": "Nike Running Shoes",
      "Price": "$85.00",
      "Description": "-"
    }
  ]
}
