## FAQ

**Q: What can I do if my builds fail suddenly from a broken Essential Next.js plugin release or plugin dependency?**

A: Check out the plugin's [releases](https://github.com/netlify/netlify-plugin-nextjs/releases). You can manually install `npm install --save @netlify/plugin-nextjs@3.x.x` at the last working version.
Once a new working release is out, you can uninstall the plugin at this locked version (`npm uninstall --save @netlify/plugin-nextjs`), which will re-enable Netlify's build system to use the latest plugin version by default.
