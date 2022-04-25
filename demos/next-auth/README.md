## NextAuth.js Example

This example project came from [next-auth-example](https://github.com/nextauthjs/next-auth-example) provided by the NextAuth.js and was modified to use Netlify as the authentication provider as an example.

For more details on how to get set up and configured with various providers, visit the link above.

### Running locally

Within this project directory:

```
npm install
npm run dev
```

### Configuring your local environment

Copy the .env.local.example file in this directory to .env.local (which will be ignored by Git):

```
cp .env.local.example .env.local
```

Add details for the [Netlify Provider](https://next-auth.js.org/providers/netlify), which will require create a Netlify OAuth application.

To create a Netlify OAuth application:
* Visit `https://app.netlify.com/user/applications`
* Click 'New OAuth App'
* Enter an application name
* Enter a redirect URI (for the purposes of this demo application you would use `http://localhost:3000/api/auth/callback/netlify`)
* Save the application, and copy the value for 'Client ID' as the `NETLIFY_CLIENT_ID` and the 'Client Secret' as the `NETLIFY_CLIENT_SECRET` into your `.env.local` file within the project
  * If you're testing this on a deployed Netlify site you'll need to set the environment variables as part of the `Site Settings > Build & Deploy > Environment` settings. You'll also need to generate a `NEXTAUTH_SECRET` environment variable and set that for a production build.

For configuring additional authentication providers, see the original documentation [here](https://github.com/nextauthjs/next-auth-example#3-configure-authentication-providers)
