#!/usr/bin/env node

require('dotenv').config()
const { Command } = require('commander')
const { name: scopedName, version } = require('../package.json')
const { check, example, integrate, reg_android, reg_ios, deploy_ios } = require('./cmd')

const splitName = scopedName.split('/')
const name = splitName[splitName.length - 1]

const program = (new Command())

.name(name)
.version(version)

.addCommand(check)
.addCommand(example)
.addCommand(integrate)
.addCommand(reg_android)
.addCommand(reg_ios)
.addCommand(deploy_ios)

.parse(process.argv)
