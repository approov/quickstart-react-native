#!/usr/bin/env node

require('dotenv').config()
const { Command } = require('commander')
const { name: scopedName, version } = require('../package.json')
const check = require('./cmd/check')
const example = require('./cmd/example')
const integrate = require('./cmd/integrate')
const sync = require('./cmd/sync')
const whoami = require('./cmd/whoami')

const splitName = scopedName.split('/')
const name = splitName[splitName.length - 1]

const program = (new Command())

.name(name)
.version(version)

.addCommand(check)
.addCommand(example)
.addCommand(integrate)
.addCommand(sync)
.addCommand(whoami)

.parse(process.argv)
