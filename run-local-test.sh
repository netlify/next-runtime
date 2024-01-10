#!/bin/sh
set -e 
# Print usage if nothing is passed
if [ -z "$1" ]; then
  echo "Usage: $0 <test-pattern>"
  exit 1
fi
# Check that the next.js directory exists
if [ ! -d "../next.js" ]; then
  echo "Error: next.js repo needs to be in ../next.js"
  exit 1
fi
export NEXT_TEST_CONTINUE_ON_ERROR=1
export NETLIFY_SITE_ID=1d5a5c76-d445-4ae5-b694-b0d3f2e2c395
export NEXT_TEST_MODE=deploy
cd ../next.js/
node run-tests.js --type e2e --debug --test-pattern $1
