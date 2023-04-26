import { transform } from 'regexp-tree'

// The Go regexp lib doesn't support lookaheads, so we need to remove them
export const stripLookahead = (regex: string) => {
  // Early return if there's no lookahead
  if (!regex?.includes('(?!')) {
    return regex
  }
  try {
    // Parse the regexp into an AST
    const re = transform(`/${regex}/`, {
      Assertion(path) {
        // Remove the lookahead
        if (path.node.kind === 'Lookahead') {
          path.remove()
        }
      },
    })
    // Strip the leading and trailing slashes
    return re.toString().slice(1, -1)
  } catch {
    //  Failed to parse regex, so return unchanged
    return regex
  }
}

// The Go regexp lib has alternative syntax for named capture groups
export const transformCaptureGroups = (regex: string) => regex.replace(/\(\?<\w+>/, '(')

const LOCALIZED_REGEX_PREFIX_13_1 = '(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/([^/.]{1,}))'
const OPTIONAL_REGEX_PREFIX_13_1 = '(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/([^/.]{1,}))?'

const LOCALIZED_REGEX_PREFIX_13_3 = '(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/)[^/.]{1,}))'
const OPTIONAL_REGEX_PREFIX_13_3 = '(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/)[^/.]{1,}))?'

// Make the locale section of the matcher regex optional
export const makeLocaleOptional = (regex: string) => regex.replace(LOCALIZED_REGEX_PREFIX_13_1, OPTIONAL_REGEX_PREFIX_13_1).replace(LOCALIZED_REGEX_PREFIX_13_3, OPTIONAL_REGEX_PREFIX_13_3)
