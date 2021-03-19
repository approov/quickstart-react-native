/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// file system extras

const fs = require('fs-extra')

module.exports = {
  ...fs,

  isAccessible: (file, mode = fs.constants.F_OK) => {
    try {
      fs.accessSync(file, mode)
    } catch {
      return false
    }
    return true
  },

  isReadable: (file) => {
    try {
      fs.accessSync(file, fs.constants.R_OK)
    } catch {
      return false
    }
    return true
  },

  isWritable: (file) => {
    try {
      fs.accessSync(file, fs.constants.W_OK)
    } catch {
      return false
    }
    return true
  },

  isFile: (file, mode = fs.constants.F_OK) => {
    try {
      fs.accessSync(file, mode)
      const stats = fs.statSync(file)
      return stats ? stats.isFile() : false
    } catch {
      return false
    }
  },

  isDirectory: (dir, mode = fs.constants.F_OK) => {
    try {
      fs.accessSync(dir, mode)
      const stats = fs.statSync(dir)
      return stats ? stats.isDirectory() : false
    } catch {
      return false
    }
  },

  /**
   * Compares the last modified times of two paths.
   * 
   * @returns >0 if path1 mtime more recent than path2 mtime, 
   *           0 if the mtimes are the same, and 
   *          <0 if path1 mtime less recent than path2 mtime.
   */
  compareMtimes: (path1, path2) => {
    if (!path1 && !path2) return 0
    if (!path1) return -1
    if (!path2) return 1

    const stat1 = fsx.statsSync(path1)
    const stat2 = fsx.statsSync(path2)

    if (!stat1 && !stat2) return 0
    if (!stat1) return -1
    if (!stat2) return 1

    return stat1.mtimeMs >= stat2.mtimeMs ? stat1.mtimeMs > stat2.mtimeMs ? 1 : 0 : -1
  }
}
