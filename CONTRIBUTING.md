# Contributing to Netlify Essential Plugins

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

The following is a set of guidelines for contributing to Netlify and its packages, which are hosted in the Netlify Organization on GitHub. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

Please note, we have a [code of conduct](CODE_OF_CONDUCT.md). Please follow it in all your interactions with this project.

These guidelines will help you send a pull request.

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
    - [Before Submitting A Bug Report](#before-submitting-a-bug-report)
    - [How Do I Submit A (Good) Bug Report?](#how-do-i-submit-a-good-bug-report)
      - [What is a reproducible test case?](#what-is-a-reproducible-test-case)
      - [Why should you create a reproducible test case?](#why-should-you-create-a-reproducible-test-case)
      - [Steps to create a reproducible test case](#steps-to-create-a-reproducible-test-case)
      - [Benefits of reproducible test cases](#benefits-of-reproducible-test-cases)
  - [Suggesting Enhancements](#suggesting-enhancements)
    - [Before Submitting An Enhancement Suggestion](#before-submitting-an-enhancement-suggestion)
    - [How Do I Submit A (Good) Enhancement Suggestion?](#how-do-i-submit-a-good-enhancement-suggestion)
  - [Pull Requests](#pull-requests)
- [Styleguides](#styleguides)
  - [Git Commit Messages](#git-commit-messages)
  - [JavaScript Styleguide](#javascript-styleguide)
  - [Documentation Styleguide](#documentation-styleguide)

## Code of Conduct

This project and everyone participating in it is governed by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the Netlify team.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report :pencil:, reproduce the behavior :computer: :computer:, and find related reports :mag_right:.

Before creating bug reports, please check [this list](#before-submitting-a-bug-report) as you might find out that you don't need to create one. When you are creating a bug report, please [include as many details as possible](#how-do-i-submit-a-good-bug-report). Fill out [the required template](https://github.com/netlify/netlify-plugin-nextjs/blob/main/.github/ISSUE_TEMPLATE/bug_report.md), the information it asks for helps us resolve issues faster.

> **Note:** If you find a **Closed** issue that seems like it is the same thing that you're experiencing, open a new issue and include a link to the original issue in the body of your new one.

#### Before Submitting A Bug Report

* **Check the [forum](https://answers.netlify.com/)** for a list of common questions and problems related to this plugin.
* **Perform a [cursory search](https://github.com/netlify/netlify-plugin-nextjs/search?q=)** to see if the problem has already been reported. If it has **and the issue is still open**, add a comment to the existing issue instead of opening a new one.

#### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/). Create an issue and provide the following information by filling in [the template](https://github.com/netlify/netlify-plugin-nextjs/blob/main/.github/ISSUE_TEMPLATE/bug_report.md).

Explain the problem and include a reproduction where possible, or additional details to help maintainers reproduce the problem.

* **Use a clear and descriptive title** for the issue to identify the problem.
* **A link to a reproduction** where possible. [Follow these steps to produce a reproduction](#what-is-a-reproducible-test-case)
* **Describe the exact steps which reproduce the problem** in as many details as possible. When listing steps, **don't just say what you did, but explain how you did it**.
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples. If you're providing snippets in the issue, use [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem. You can use [this tool](https://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or [this tool](https://github.com/GNOME/byzanz) on Linux.

Provide more context by answering these questions:

* **Did the problem start happening recently** (e.g. after updating to a new version) or was this always a problem?
* **Can you reliably reproduce the issue?** If not, provide details about how often the problem happens and under which conditions it normally happens.

##### What is a reproducible test case?

A reproducible test case is a small site built to demonstrate a problem - often this problem is caused by a bug in the plugin. Your reproducible test case should contain the bare minimum features needed to clearly demonstrate the bug.

##### Why should you create a reproducible test case?

A reproducible test case lets you isolate the cause of a problem, which is the first step towards fixing it!

The [most important part of any bug report](https://developer.mozilla.org/en-US/docs/Mozilla/QA/Bug_writing_guidelines#Writing_precise_steps_to_reproduce) is to describe the exact steps needed to reproduce the bug.

A reproducible test case is a great way to share a specific environment that causes a bug. Your reproducible test case is the best way to help people that want to help _you_.

##### Steps to create a reproducible test case

- Create a new site with a starter, like the Next.js
- Add our plugin and other plugins that are needed to demonstrate the problem.
- Add the code needed to recreate the error you've seen.
- Publish the code (your GitHub account is a good place to do this) and then link to it when creating an issue.

##### Benefits of reproducible test cases

- Smaller surface area: By removing everything but the error, you don't have to dig to find the bug.
- No need to publish secret code: You might not be able to publish your main site (for many reasons). Remaking a small part of it as a reproducible test case allows you to publicly demonstrate a problem without exposing any secret code.
- Proof of the bug: Sometimes a bug is caused by some combination of settings on your machine. A reproducible test case allows contributors to pull down your build and test it on their machines as well. This helps verify and narrow down the cause of a problem.
- Get help with fixing your bug: If someone else can reproduce your problem, they often have a good chance of fixing the problem. It's almost impossible to fix a bug without first being able to reproduce it.
 
### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality. Following these guidelines helps maintainers and the community understand your suggestion :pencil: and find related suggestions :mag_right:.

Before creating enhancement suggestions, please check [this list](#before-submitting-an-enhancement-suggestion) as you might find out that you don't need to create one. When you are creating an enhancement suggestion, please [include as many details as possible](#how-do-i-submit-a-good-enhancement-suggestion). Fill in [the template](https://github.com/netlify/netlify-plugin-nextjs/blob/main/.github/ISSUE_TEMPLATE/feature_request.md), including the steps that you imagine you would take if the feature you're requesting existed.

#### Before Submitting An Enhancement Suggestion

* **Perform a [cursory search](https://github.com/netlify/netlify-plugin-nextjs/search?q=)** to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.

#### How Do I Submit A (Good) Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://guides.github.com/features/issues/). Create an issue and provide the following information:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets which you use in those examples, as [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Include screenshots and animated GIFs** which help you demonstrate the steps or point out which feature the suggestion is related to. You can use [this tool](https://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or [this tool](https://github.com/GNOME/byzanz) on Linux.
* **Explain why this enhancement would be useful** and why.

### Pull Requests

The process described here has several goals:

- Maintain the project's quality
- Fix problems that are important to users
- Engage the community in working toward the best solutions possible
- Enable a sustainable system for the project's maintainers to review contributions

Please follow these steps to have your contribution considered by the maintainers:

1. Follow [the PR template](https://github.com/netlify/netlify-plugin-nextjs/blob/main/.github/PULL_REQUEST_TEMPLATE.md)
2. Follow the [styleguides](#styleguides)
3. After you submit your pull request, verify that all [status checks](https://help.github.com/articles/about-status-checks/) are passing <details><summary>What if the status checks are failing?</summary>If a status check is failing, and you believe that the failure is unrelated to your change, please leave a comment on the pull request explaining why you believe the failure is unrelated. A maintainer will re-run the status check for you. If we conclude that the failure was a false positive, then we will open an issue to track that problem with our status check suite.</details>

While the prerequisites above must be satisfied prior to having your pull request reviewed, the reviewer(s) may ask you to complete additional design work, tests, or other changes before your pull request can be ultimately accepted.

## Styleguides

### Git Commit Messages

We use [Conventional Commit messages](https://www.conventionalcommits.org/) to automate version management.

Most common commit message prefixes are:

* `fix:` which represents bug fixes, and generate a patch release.
* `feat:` which represents a new feature, and generate a minor release.
* `feat!:`, `fix!:` or `refactor!:` and generate a major release.

For your commit message description consider these points:

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

All JavaScript code is linted with [Prettier](https://prettier.io/).

* Prefer the object spread operator (`{...anotherObj}`) to `Object.assign()`

### Documentation Styleguide

* Use [Markdown](https://github.github.com/gfm). 
