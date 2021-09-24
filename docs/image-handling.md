## Image Handling

The Essential Next.js plugin includes a function to generate images for `next/image`. The images are resized on the fly, so the first request will have a short delay. However because the function uses [On-Demand Builders](https://docs.netlify.com/configure-builds/on-demand-builders/), any subsequent requests for that image are served from the edge cache and are super-fast.

By default, images are returned in the same format as the source image if they are in JPEG, PNG, WebP or AVIF format. If you are only targeting modern browsers and want to live life on the edge, you can [set the environment variable](https://docs.netlify.com/configure-builds/environment-variables/) `FORCE_WEBP_OUTPUT` to `"true"`, and it will return all images in WebP format. This must be set in the UI or via the `netlify env:set` command. Any env vars set in `netlify.toml` are not available to functions. Setting this will often lead to significant improvements in file size. However you should not use this if you need to support older browsers, as `next/image` does not support picture tag source fallback and images will appear broken. Check [browser support](https://caniuse.com/webp) to see if you are happy to do this.

If you want to use remote images in `next/image`, you will need to add the image domains to an allow list. Add the required domains to the `images.domains` array in `next.config.js`. 

In previous versions of the Essential Next.js plugin you needed to set the environment variable `NEXT_IMAGE_ALLOWED_DOMAINS` rather than using the Next config file. This is no longer required, and will be removed in a future version.
