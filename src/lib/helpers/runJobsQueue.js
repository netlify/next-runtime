const os = require('os')

const fastq = require('fastq')

const { processPage } = require('../pages/worker')

const runJobsQueue = (jobs) => {
  console.log(`Building ${jobs.length} pages`)

  const queue = fastq.promise(processPage, 4)

  return Promise.all(jobs.map((job) => queue.push(job)))
}

module.exports = runJobsQueue
