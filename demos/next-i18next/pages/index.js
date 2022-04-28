import Link from 'next/link'
import { useRouter } from 'next/router'

import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export default function IndexPage() {
  const router = useRouter()
  const { t } = useTranslation('common')

  return (
    <>
      <h1>next-i18next Example</h1>
      <p>
        This is an example site to demonstrate how to use{' '}
        <a href="https://github.com/isaachinman/next-i18next">next-i18next</a> for internationalization.
      </p>
      <div>
        <Link href="/" locale={router.locale === 'en' ? 'fr' : 'en'}>
          <a>Change locale</a>
        </Link>
      </div>
      <p>The text below will be translated:</p>
      <h2>{t('language')}</h2>
      <p>{t('dogs')}</p>
    </>
  )
}

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
