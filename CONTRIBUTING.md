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

1. Merge the release PR
2. Run `npm publish`
