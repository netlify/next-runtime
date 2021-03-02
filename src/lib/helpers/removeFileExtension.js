// Remove the file extension form the route
const removeFileExtension = (route) => route.replace(/\.[a-zA-Z]+$/, '')

module.exports = removeFileExtension
