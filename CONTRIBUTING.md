# Contributions

🎉 Thanks for considering contributing to this project! 🎉

When contributing to this repository, please first discuss the change you wish to make via an
[issue](https://github.com/netlify/next-runtime/issues/new/choose). Please use the issue templates. They are there to
help you and to help the maintainers gather information.

Before working on an issue, ask to be assigned to it. This makes it clear to other potential contributors that someone
is working on the issue.

When creating a PR, please use the template. The information in the template helps maintainers review your pull request.```

This project was made with ❤️. The simplest way to give back is by starring and sharing it online.

Everyone is welcome regardless of personal background. We enforce a [Code of conduct](CODE_OF_CONDUCT.md) in order to
promote a positive and inclusive environment.

## Development process

First fork and clone the repository. If you're not sure how to do this, please watch
[these videos](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github).

Run:

```bash
npm install
```

Make sure everything is correctly setup with:

```bash
npm test
```

## How to write commit messages

We use [Conventional Commit messages](https://www.conventionalcommits.org/) to automate version management.

Most common commit message prefixes are:

- `fix:` which represents bug fixes, and generate a patch release.
- `feat:` which represents a new feature, and generate a minor release.
- `feat!:`, `fix!:` or `refactor!:` and generate a major release.

## Releasing

This repository uses [release-please](https://github.com/googleapis/release-please) to automate its releases.

## How to make a minimal reproduction

A reproducible test case is a small Next.js site built to demonstrate a problem - often this problem is caused by a bug in Next.js, next-runtime or user code. Your reproducible test case should contain the bare minimum features needed to clearly demonstrate the bug.

Steps to create a reproducible test case:

- Create a new Next.js site: `npx create-next-app@latest`
- Add any code or functionality related to the issue. For example, if you have problems with middleware functionality you should add all the necessary code of your middleware.
- Verify that you're seeing the expected error(s) when running `netlify serve` and on a deployed version on [Netlify](https://www.netlify.com)
- Publish the code (your GitHub account is a good place to do this) and then link to it when creating an issue. While creating the issue, please give as many details as possible. This could also include screenshots of error messages.
