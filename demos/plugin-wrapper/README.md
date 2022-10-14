# plugin-wrapper

This empty plugin exists to ensure the demo sites can use `"@netlify/plugin-local-install-core"` to run `npm install`,
which in turn builds the runtime package. This is needed because `npm install` isn't run in the site if the dependencies
are unchanged.
