import got from 'got'
import { writeFile } from '../utils/index.js'
import * as cheerio from 'cheerio'

const baseSite = 'https://en.digimoncard.com/cardlist'

const genAllSite = async () => {
    const allSite = []
    const siteRes = await got.get(baseSite)
    const $ = cheerio.load(siteRes.body)
    const allA = $('a')
    for (const a of allA) {
        if (a.attribs.href?.includes('?search=true&category')) {
            allSite.push(baseSite + a.attribs.href)
        }
    }

    writeFile(
        new URL('json/all-site.json', import.meta.url).pathname,
        JSON.stringify(allSite),
    )
}

export { genAllSite }
