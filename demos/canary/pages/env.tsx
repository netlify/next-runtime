import { useEffect, useState } from 'react'

/**
 * https://nextjs.org/docs/basic-features/environment-variables
 */
function EnvTest() {
  const [showEnv, setShowEnv] = useState(false)
  useEffect(() => setShowEnv(true), [])
  return (
    <div>
      <h1>Environment Variables</h1>
      <a href="https://nextjs.org/docs/basic-features/environment-variables">Read Docs</a>
      <p>
        By default environment variables are only available in the Node.js environment, meaning they won&apos;t be
        exposed to the browser.
      </p>
      <p>
        <code>NEXT_PUBLIC_</code> environment variables are available in the browser, and can be used to configure the
        application.
      </p>
      {showEnv ? (
        <>
          <p>
            ✅ Public Environment token found:{' '}
            <code>{process.env.NEXT_PUBLIC_GREETINGS || 'NOT FOUND (something went wrong)'}</code>
          </p>
          <p>
            ❌ Private Environment token should not be found:{' '}
            <code>{process.env.TEST_ENV_VAR || 'Everything worked'}</code>
          </p>
        </>
      ) : (
        'We only want to test client-side env vars'
      )}
    </div>
  )
}

export default EnvTest
