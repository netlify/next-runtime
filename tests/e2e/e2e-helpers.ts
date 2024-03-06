import { valid, satisfies } from 'semver'

export function nextVersionSatisfies(condition: string) {
  const currentVersion = process.env.NEXT_VERSION ?? 'latest'
  if (!valid(currentVersion)) {
    // latest and canary are ok
    return true
  }
  return satisfies(currentVersion, condition)
}
