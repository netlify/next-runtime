const os = require('os')

const fastq = require('fastq')

const { processPage } = require('../pages/worker')

// TODO: benchmark a large site to find a good value for this
const PAGE_CONCURRENCY = 4

const runJobsQueue = (jobs) => {
  console.log(`Building ${jobs.length} pages`)

  const queue = fastq.promise(processPage, PAGE_CONCURRENCY)

  return Promise.all(jobs.map((job) => queue.push(job)))
}

module.exports = runJobsQueue
