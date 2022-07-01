import got from 'got'
import { readFile, writeFile } from '../utils/index.js'
import fs from 'fs'
// import * as cheerio from 'cheerio'

// const allSite = JSON.parse(readFile('./digimon-tcg-2020/json/all-site.json'))
// const res = await got.get(allSite[0])
// const $ = cheerio.load(res.body)

const baseSite = 'https://digimoncard.app/'
const basePath = './digimon-tcg-2020/images'
const cards = JSON.parse(readFile('./digimon-tcg-2020/json/all-card.json'))
const promiseCard = []

const request = async (card) => {
  const box = card.id.split('-')[0]
  const destPath = `${basePath}/${box}/${card.id}.jpg`
  if (fs.existsSync(destPath)) {
    return
  }

  const res = await got.get(`${baseSite}${card.cardImage}`)
  writeFile(destPath, res.rawBody)
}

for (const card of cards) {
  promiseCard.push(request(card))
}

await Promise.all(promiseCard)

// const matchPromo = /(?:(Promotion))/g
// const matchBox = /(?:\[([\w-]+)\])/g
// let match = boxTitle.matchAll(matchBox)
// console.log([...match][0][1])
// if () {

// }

// const baseSite = 'https://en.digimoncard.com'
// const cards = $('.image_lists_item > .popup')
// const card = cards[99]
// const boxTitle = $('title').text().split(' CARDLIST｜')[0]
// const cardUrl =
//   baseSite + $(card).find('.card_img').children()[0].attribs.src.substring(2)
// const cardDetailEle = $(card).find('.card_detail')
// const cardColors = []
// cardDetailEle[0].attribs.class.split(' ').forEach((className) => {
//   cardColors.push(
//     ...className
//       .replace('card_detail', '')
//       .split('_')
//       .filter((color) => color),
//   )
// })

// console.log(cardUrl)

// const cardNo = $(card).find('.cardno').text()
// const cardType = $(card).find('.cardtype').text()
// const cardName = $(card).find('.card_name').text()

// const [
//   formEle,
//   attributeEle,
//   typeEle,
//   dpEle,
//   playCostEle,
//   digiCost1Ele,
//   digiCost2Ele,
// ] = $(card).find('.cardinfo_top_body').children()

// console.log(
//   cardName,
//   cardNo,
//   cardType,
//   formEle.children[3].children[0].data,
//   attributeEle.children[3].children[0].data,
//   typeEle.children[3].children[0].data,
//   dpEle.children[3].children[0].data,
//   playCostEle.children[3].children[0].data,
//   digiCost1Ele.children[3].children[0].data,
//   digiCost2Ele.children[3].children[0].data,
// )
