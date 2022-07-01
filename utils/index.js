import fs from 'fs'
import path from 'path'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const writeFile = (name, content) => {
  fs.mkdirSync(path.resolve(path.dirname(name)), {
    recursive: true,
  })

  let saveContent = content
  const fileExt = path.extname(name)
  if (fileExt === '.json') {
    saveContent = Buffer.from(JSON.stringify(content))
    fs.writeFileSync(name, saveContent),
      {
        encoding: 'utf-8',
        flag: 'as',
      }
  } else if (['.jpg', '.png'].includes(fileExt)) {
    const buffer = Buffer.from(content)
    fs.createWriteStream(name).write(buffer)
  }
}

const readFile = (name) => {
  return fs.readFileSync(name, { encoding: 'utf-8' })
}

const existFile = (name) => {
  return fs.existsSync(name)
}

export { sleep, writeFile, readFile, existFile }
