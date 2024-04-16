import { Parser } from 'htmlparser2'

import type { NetlifyForm } from '../plugin-context.js'

const formFieldTags = new Set(['input', 'textarea', 'select'])

export function detectForms(html: string): Map<string, NetlifyForm> | void {
  let inForm = false
  let currentForm: NetlifyForm
  const forms = new Map<string, NetlifyForm>()
  if (!html) {
    return
  }
  const parserStream = new Parser({
    onopentag(name, attrs) {
      if (name === 'form' && (attrs.netlify !== undefined || attrs['data-netlify'])) {
        inForm = true
        currentForm = {
          name: attrs.name,
          fields: new Set(),
          action: attrs.action,
          honeypotField: attrs['netlify-honeypot'],
          recaptcha: Boolean(attrs['data-netlify-recaptcha']),
        }
      }
      if (!inForm) {
        return
      }
      if (name === 'input' && attrs.type === 'hidden' && attrs.name === 'form-name') {
        currentForm.name = attrs.value
      } else if (formFieldTags.has(name) && attrs.name) {
        currentForm.fields.add(attrs.name)
      }
    },
    onclosetag(name) {
      if (name === 'form' && inForm) {
        inForm = false
        if (currentForm.name) {
          forms.set(currentForm.name, currentForm)
        } else {
          console.warn('Netlify Form detected with no name')
        }
      }
    },
  })
  parserStream.write(html)
  parserStream.end()
  return forms
}
