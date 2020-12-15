#!/usr/bin/env node

require('dotenv').config()

const { Command } = require('commander')

const { name: scopedName, version } = require('../package.json')
const check = require('./check')
const example = require('./example')
const examples = require('./examples')
const integrate = require('./integrate')
const sync = require('./sync')

const splitName = scopedName.split('/')
const name = splitName[splitName.length - 1]

const program = (new Command())

.name(name)
.version(version)

.addCommand(check)
.addCommand(example)
.addCommand(examples)
.addCommand(integrate)
.addCommand(sync)

.parse(process.argv)
