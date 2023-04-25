import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    // integrationFolder was replaced by specPattern in Cypress 12 https://docs.cypress.io/guides/references/migration-guide#integrationFolder
    "specPattern": "cypress/e2e/nx",
    "projectId": "ijcdpo"
  },
})
