interface Annotation {
  link: string
  name: string
  reason: string
}

async function writeToConfig(
  filePath: string,
  failures: { link: string; name: string; reason: string }[],
) {
  const testConfig = JSON.parse(await Deno.readTextFile(filePath))
  testConfig.failures = failures
  await Deno.writeTextFile(filePath, JSON.stringify(testConfig))
}

async function formatIssues(file: string) {
  const issues = JSON.parse(await Deno.readTextFile(file)) as { body: string; url: string }[]
  const annotations: Annotation[] = []

  issues.forEach(({ url, body }) => {
    const name = body.match(/^test: (.+)$/m) || []
    const reason = body.match(/^reason: (.+)$/m) || []
    const testNames = name[1]?.split(',')

    testNames?.forEach((name) => {
      annotations.push({
        link: url,
        reason: reason[1],
        name: name.trim(),
      })
    })
  })

  writeToConfig(Deno.args[0], annotations)
}

formatIssues(Deno.args[1])
