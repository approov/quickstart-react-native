const { Command } = require('commander')
const fs = require('fs')
const cliui = require('cliui')

const command = (new Command())

.name('examples')
.description('list available quickstart app examples')

.action((opts) => {
  const examplesDir = `${__dirname}/../examples`
  let table = '\n'
  fs.readdirSync(examplesDir).forEach(file => {
    const { description } = require(`${examplesDir}/${file}/package.json`)
    table += (`  ${file}\t  ${description}\n`)
  })

  const ui = cliui()
  ui.div(table)
  console.log(ui.toString())
})

module.exports = command
