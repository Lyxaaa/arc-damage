// Downloads RaidTheory item JSON (prices/recipes) into data/raw/raidtheory (gitignored).
import fs from 'node:fs'
const base = 'https://raw.githubusercontent.com/RaidTheory/arcraiders-data/main/'
const list = await (await fetch('https://api.github.com/repos/RaidTheory/arcraiders-data/contents/items')).json()
fs.mkdirSync('data/raw/raidtheory/items', { recursive: true })
await Promise.all(list.map(async (f) => fs.writeFileSync('data/raw/raidtheory/items/' + f.name, Buffer.from(await (await fetch(base + 'items/' + f.name)).arrayBuffer()))))
console.log('fetched', list.length)
