import Script from 'next/script'

/**
 * Missing: options for script strategies
 * https://nextjs.org/docs/basic-features/script
 */
function ScriptTest() {
  return (
    <div>
       <h1>Handling Scripts</h1>
      <a href="https://nextjs.org/docs/basic-features/script">Read Docs</a>
      <p>
      The Next.js Script component, next/script, is an extension of the HTML <code>script</code> element. It enables developers to set the loading priority of third-party scripts anywhere in their application without needing to append directly to next/head, saving developer time while improving loading performance.
      </p>
      <p>
        There should be fake google tag manager scripts on this page that were loaded using <code>Script</code>
      </p>
      <Script
        strategy="afterInteractive"
        id="test-script"
        dangerouslySetInnerHTML={{
          __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer', 'GTM-XXXXXX');
        `,
        }}
      />
    </div>
  )
}

export default ScriptTest