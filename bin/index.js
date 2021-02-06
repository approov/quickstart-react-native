#!/usr/bin/env node

require('dotenv').config()
const { Command } = require('commander')
const { name: scopedName, version } = require('../package.json')
const { check, example, integrate, prep, sync } = require('./cmd')

const splitName = scopedName.split('/')
const name = splitName[splitName.length - 1]

const program = (new Command())

.name(name)
.version(version)

.addCommand(check)
.addCommand(example)
.addCommand(integrate)
.addCommand(prep)
.addCommand(sync)

.parse(process.argv)
