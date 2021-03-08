// Helpers for writing info to console.log
const { program } = require('commander')

// Number of items processed in current build step
let itemsCount = 0

// Format in bold
const logTitle = (...args) => {
  // Finish previous log section
  finishLogForBuildStep()

  // Print title
  log(`\x1b[1m${args.join(' ')}\x1b[22m`)
}

// Indent by three spaces
const logItem = (...args) => {
  // Display item if within max log lines
  if (itemsCount < program.maxLogLines) log('  ', ...args)

  itemsCount += 1
}

// Just console.log
const log = (...args) => console.log(...args)

// Finish log section: Write a single line for any suppressed/hidden items
// and reset the item counter
const finishLogForBuildStep = () => {
  // Display number of suppressed log lines
  if (itemsCount > program.maxLogLines) {
    const hiddenLines = itemsCount - program.maxLogLines
    log('  ', '+', hiddenLines, 'more', '(run next-on-netlify with --max-log-lines XX to', 'show more or fewer lines)')
  }

  // Reset counter
  itemsCount = 0
}

module.exports = {
  logTitle,
  logItem,
  log,
}
