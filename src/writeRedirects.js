// @ts-check
const { writeFile } = require("fs").promises;
const { readJSON } = require("fs-extra");
const path = require("path");

const ODB_FUNCTION_PATH = "/.netlify/functions/___netlify-odb-handler";
const HANDLER_FUNCTION_PATH = "/.netlify/functions/___netlify-handler";

const CATCH_ALL_REGEX = /\/\[\.{3}(.*)](.json)?$/;
const OPTIONAL_CATCH_ALL_REGEX = /\/\[{2}\.{3}(.*)]{2}(.json)?$/;
const DYNAMIC_PARAMETER_REGEX = /\/\[(.*?)]/g;

const getNetlifyRoutes = (nextRoute) => {
  let netlifyRoutes = [nextRoute];

  // If the route is an optional catch-all route, we need to add a second
  // Netlify route for the base path (when no parameters are present).
  // The file ending must be present!
  if (OPTIONAL_CATCH_ALL_REGEX.test(nextRoute)) {
    let netlifyRoute = nextRoute.replace(OPTIONAL_CATCH_ALL_REGEX, "$2");

    // When optional catch-all route is at top-level, the regex on line 19 will
    // create an empty string, but actually needs to be a forward slash
    if (netlifyRoute === "") netlifyRoute = "/";

    // When optional catch-all route is at top-level, the regex on line 19 will
    // create an incorrect route for the data route. For example, it creates
    // /_next/data/%BUILDID%.json, but NextJS looks for
    // /_next/data/%BUILDID%/index.json
    netlifyRoute = netlifyRoute.replace(
      /(\/_next\/data\/[^/]+).json/,
      "$1/index.json"
    );

    // Add second route to the front of the array
    netlifyRoutes.unshift(netlifyRoute);
  }

  // Replace catch-all, e.g., [...slug]
  netlifyRoutes = netlifyRoutes.map((route) =>
    route.replace(CATCH_ALL_REGEX, "/:$1/*")
  );

  // Replace optional catch-all, e.g., [[...slug]]
  netlifyRoutes = netlifyRoutes.map((route) =>
    route.replace(OPTIONAL_CATCH_ALL_REGEX, "/*")
  );

  // Replace dynamic parameters, e.g., [id]
  netlifyRoutes = netlifyRoutes.map((route) =>
    route.replace(DYNAMIC_PARAMETER_REGEX, "/:$1")
  );

  return netlifyRoutes;
};

exports.writeRedirects = async function ({
  publishDir = "out",
  nextRoot = process.cwd(),
  netlifyConfig,
}) {
  const { dynamicRoutes } = await readJSON(
    path.join(nextRoot, ".next", "prerender-manifest.json")
  );

  const redirects = [];
  Object.entries(dynamicRoutes).forEach(([route, { dataRoute, fallback }]) => {
    // We want to add redirects if the fallback is "null" or true
    if (fallback === false) {
      return;
    }
    redirects.push(...getNetlifyRoutes(route), ...getNetlifyRoutes(dataRoute));
  });
  redirects.sort();

  // This is only used in prod, so dev uses `next dev` directly
  netlifyConfig.redirects.push(
    ...redirects.map((redirect) => ({
      from: redirect,
      to: ODB_FUNCTION_PATH,
      status: 200,
    })),
    { from: "/_next/static/*", to: "/static/:splat", status: 200 },
    { from: "/*", to: HANDLER_FUNCTION_PATH, status: 200 }
  );
  // If we want to use the Netlify functions handler we'd need to do it like this,
  // as `ntl dev` doesn't support mutating redirects at the moment. Maybe this should be an env var, to make testing easier?
  // const odbRedirects = `${redirects
  //   .map((redir) => `${redir} ${ODB_FUNCTION_PATH} 200`)
  //   .join("\n")}
  // /_next/static/* /static/:splat 200
  // /* ${HANDLER_FUNCTION_PATH} 200
  //     `;
  // await writeFile(path.join(nextRoot, publishDir, "_redirects"), odbRedirects);
};
