## Sample Next.js Project

This is a sample Next.js project. It's used to conveniently test the plugin as a local plugin against a real project.

To test:

`netlify build`

On the first run, you'll need to link the project to a Netlify site. This will create a `state.json` file in the .netlify directory, which is .gitignored.

This is strictly for the ease of developers trying to run the plugin locally while more thorough tests are written.

* Caveat *

Right now, it seems the plugin `packageJson` change is not supported in the CLI. To accommodate, we'll always default packageJson to an empty object even though we should fail the build if it doesn't exist.
