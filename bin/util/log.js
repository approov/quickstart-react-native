const colorette = require('colorette');
const { blue, red } = colorette;

class LogError extends Error {
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LogError);
    }
    this.name = 'LogError';
    this.date = new Date();
  }
}

class Log {
  constructor() {
    this.spinner = null;
    this.initSpinner();
  }

  async initSpinner() {
    try {
      const oraModule = await import('ora');
      this.spinner = oraModule.default();
    } catch (error) {
      console.error('Failed to load ora:', error);
      process.exit(1); // Exit if ora cannot be loaded
    }
  }

  spin(msg) {
    if (this.spinner) {
      this.spinner.start(msg || ' ');
    } else {
      //console.error('Spinner is not initialized');
    }
  }

  note(msg) {
    if (this.spinner) {
      this.spinner.stopAndPersist({ symbol: ' ', text: msg || ' ' });
    } else {
      console.log(msg || ' ');
    }
  }

  succeed(msg) {
    if (this.spinner) {
      this.spinner.succeed(msg || ' ');
    } else {
      console.log(msg || ' ');
    }
  }

  help(ref) {
    if (this.spinner) {
      if (ref) {
        return this.spinner.info(`See ${blue(ref)} for more info.`);
      } else {
        return this.spinner.info(`Contact support for assistance.`);
      }
    } else {
      console.log(ref ? `See ${blue(ref)} for more info.` : `Contact support for assistance.`);
    }
  }

  info(msg, help) {
    if (this.spinner) {
      this.spinner.info(msg || ' ');
    } else {
      console.log(msg || ' ');
    }
    if (help) this.help(help);
  }

  warn(msg, help) {
    if (this.spinner) {
      this.spinner.warn(msg || ' ');
    } else {
      console.log(msg || ' ');
    }
    if (help) this.help(help);
  }

  fail(msg, help = null, fatal = false) {
    if (this.spinner) {
      this.spinner.fail(msg || ' ');
    } else {
      console.log(msg || ' ');
    }
    if (help) this.help(help);
  }

  fatal(msg, help = null) {
    if (this.spinner) {
      this.spinner.fail(msg || ' ');
    } else {
      console.log(msg || ' ');
    }
    if (help) this.help(help);
    throw new LogError(msg);
  }

  exit(msg, code = 1) {
    this.fail(msg);
    process.exit(code);
  }
}

module.exports = { Log, LogError };
