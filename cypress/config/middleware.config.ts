import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8888',
    // integrationFolder was replaced by specPattern in Cypress 12 https://docs.cypress.io/guides/references/migration-guide#integrationFolder
    "specPattern": "cypress/e2e/middleware",
    "projectId": "yn8qwi"
  },
})
