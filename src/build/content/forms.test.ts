import { expect, test, describe } from 'vitest'

import { detectForms } from './forms.js'

const fixtures = {
  simple: /* html */ `<!DOCTYPE html><html lang="en"><head><body><main><form data-netlify="true" name="pizzaOrder" method="post"><input type="hidden" name="form-name" value="pizzaOrder"/><label>What order did the pizza give to the pineapple?<input type="text" name="order"/></label><input type="submit"/></form></main></body></html>`,
  netlifyAttribute: /* html */ `<!DOCTYPE html><html lang="en"><head><body><main><form netlify name="pizzaOrder" method="post"><input type="hidden" name="form-name" value="pizzaOrder"/><label>What order did the pizza give to the pineapple?<input type="text" name="order"/></label><input type="submit"/></form></main></body></html>`,
  recaptcha: /* html */ `<!DOCTYPE html><html lang="en"><head><body><main><form data-netlify="true" data-netlify-recaptcha="true" name="pizzaOrder" method="post"><input type="hidden" name="form-name" value="pizzaOrder"/><label>What order did the pizza give to the pineapple?<input type="text" name="order"/></label><input type="submit"/></form></main></body></html>`,
  notNetlify: /* html */ `<!DOCTYPE html><html lang="en"><head><body><main><form name="pizzaOrder" method="post"><input type="hidden" name="form-name" value="pizzaOrder"/><label>What order did the pizza give to the pineapple?<input type="text" name="order"/></label><input type="submit"/></form></main></body></html>`,
  nameInInput: /* html */ `<!DOCTYPE html><html lang="en"><head><body><main><form data-netlify="true" method="post"><input type="hidden" name="form-name" value="pizzaOrder"/><input type="text" name="pizzaOrder"/><input type="submit"/></form></main></body></html>`,
  noName: /* html */ `<!DOCTYPE html><html lang="en"><head><body><main><form data-netlify="true" method="post"><input type="text" name="pizzaOrder"/><input type="submit"/></form></main></body></html>`,
  multipleForms: /* html */ `<!DOCTYPE html><html lang="en"><head><body><main><form data-netlify="true" name="pizzaOrder" method="post"><input type="hidden" name="form-name" value="pizzaOrder"/><label>What order did the pizza give to the pineapple?<input type="text" name="order"/></label><input type="submit"/></form><form data-netlify="true" name="burgerOrder" method="post"><input type="hidden" name="form-name" value="burgerOrder"/><label>What order did the burger give to the pineapple?<input type="text" name="order"/></label><input type="submit"/></form></main></body></html>`,
}

describe('detectForms', () => {
  test('detects forms in HTML', async () => {
    const forms = detectForms(fixtures.simple)
    expect(forms).toBeDefined()
    const form = forms?.get('pizzaOrder')
    expect(form).toBeDefined()
    if (!form) return
    expect(form.name).toBe('pizzaOrder')
    expect(form.action).toBeUndefined()
    expect([...form.fields]).toEqual(['order'])
  })
  test('detects forms with netlify attribute in HTML', async () => {
    const forms = detectForms(fixtures.netlifyAttribute)
    expect(forms).toBeDefined()
    const form = forms?.get('pizzaOrder')
    expect(form).toBeDefined()
  })
  test('ignores forms without netlify attributes', async () => {
    const forms = detectForms(fixtures.notNetlify)
    expect(forms).toBeDefined()
    expect(forms?.size).toBe(0)
  })
  test('ignores forms with no name', async () => {
    const forms = detectForms(fixtures.noName)
    expect(forms).toBeDefined()
    expect(forms?.size).toBe(0)
  })
  test('gets name from input', async () => {
    const forms = detectForms(fixtures.nameInInput)
    expect(forms).toBeDefined()
    const form = forms?.get('pizzaOrder')
    expect(form).toBeDefined()
    expect(form?.fields.includes('pizzaOrder')).toBe(true)
  })
  test('detects multiple forms in one page', async () => {
    const forms = detectForms(fixtures.multipleForms)
    expect(forms).toBeDefined()
    expect(forms?.size).toBe(2)
    expect(forms?.get('pizzaOrder')).toBeDefined()
    expect(forms?.get('burgerOrder')).toBeDefined()
  })
  test('detects recaptcha forms in HTML', async () => {
    const forms = detectForms(fixtures.recaptcha)
    expect(forms).toBeDefined()
    const form = forms?.get('pizzaOrder')
    expect(form).toBeDefined()
    expect(form?.recaptcha).toBe(true)
  })
})
