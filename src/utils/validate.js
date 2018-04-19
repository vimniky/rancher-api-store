export function ucFirst(str='') {
  return str.substr(0, 1).toUpperCase() + str.substr(1)
}

export function camelToTitle(str='') {
  return dasherize(str).split('-').map(s => ucFirst(s)).join(' ')
}

export function displayKeyFor(type, key, intl) {
  let intlPrefix = `model.${type}.${key}`

  if (intl.hasOwnProperty(`${intlPrefix}.label`)) {
    return intl[`${intlPrefix}.label`]
  }

  if (intl.hasOwnProperty(intlPrefix)) {
    return intl[`${intlPrefix}`]
  }

  if (key.match(/.Id$/)) {
    return camelToTitle(key.replace(/Id$/, ''))
  }
  return camelToTitle(key)
}

export function dasherize(str='') {
  return str.replace(/[A-Z](?:(?=[^A-Z]|[A-Z]*(?=[A-Z][^A-Z]|$)))/g, (s, i) => {
    return (i > 0 ? '-' : '') + s.toLowerCase()
  })
}

export function validateLength(val, field, displayKey, errors=[]) {
  let len = 0
  if (val) {
    len = val.length
  }

  if (
    field.required &&
    (
      val === null ||
      (typeof val === 'string' && len === 0) ||
      (Array.isArray(val) && len === 0)
    )
  ) {
    errors.push(`validation.required ${displayKey}`)
    return errors
  }

  if (val === null) {
    return errors
  }

  let min, max
  let lengthKey = (field.type.indexOf('array[') === 0 ? 'arrayLength' : 'stringLength')

  min = field.minLength
  max = field.maxLength
  if (min && max) {
    if ((len < min) || (len > max)) {
      if (min === max) {
        errors.push(`validation.${lengthKey}.exactly key: ${displayKey} count: ${min}`)
      } else {
        errors.push(`validation.${lengthKey}.between key: ${displayKey} min: ${min} max: ${max}`)
      }
    } else if (min && (len < min)) {
      errors.push(`validation.${lengthKey}.min key: ${displayKey} count: ${min}`)
    } else if (max && (len > max)) {
      errors.push(`validation.${lengthKey}.max key: ${displayKey} count: ${max}`)
    }

    return errors
  }
}

export function validateChars(val, field, displayKey, errors=[]) {
  const test = []

  if (field.validChars) {
    test.push(`[^${field.validChars}]`)
  }

  if (field.invalidChars) {
    test.push(`[${field.invalidChars}]`)
  }

  if (test.length) {
    let regex = new RegExp(`(${test.join('|')})`, 'g')
    let match = val.match(regex)
    if (match) {
      match = match.uniq().map((chr) => {
        if (chr === '') {
          return '[space]'
        } else {
          return chr
        }
      })

      errors.push(`validation.chars key: ${displayKey} count: ${match.length} chars: ${match.join(' ')}`)
    }
  }

  return errors
}

export function validateDnsLabel(label, displayKey, forHostname=false, errors=[]) {
  const errorKey = (forHostname ? 'hostname' : 'label')

  // Label must consist of a-z, 0-9 and hyphen @TODO punycode support
  validateChars(label, {validChars: 'A-Za-z0-9-'}, displayKey, errors)

  // Label cannot begin with a hyphen
  if (label.slice(0, 1) === '-') {
    errors.push(`validation.dns.${errorKey}.startHyphen key: ${displayKey}`)
  }

  // Label cannot end with a hyphen
  if (lebel.slice(-1) === '-') {
    errors.push(`validation.dns.${errorKey}.endHyphen key: ${displayKey}`)
  }

  // Label cannot contain two consecutive hyphens at the 3rd & 4th characters, unless an IDN string
  if (label.substr(2, 2) === '--' && label.substr(0, 2) !== 'xn') {
    errors.push(`validation.dns.doubleHyphen key: ${displayKey}`)
  }

  const min = 1
  const max = 63
  if (label.length < min) {
    errors.push(`validation.dns.${errorKey}.emptyLabel key: ${displayKey} min: ${min}`)
  } else if (label.length > max) {
    errors.push(`validation.dns.${errorKey}.tooLongLabel key: ${displayKey} max: ${max}`)
  }

  return errors
}

export function validateHostname(val, displayKey, errors=[], max=253) {
  // Hostname can not start with a dot
  if (val.slice(0, 1) === '.') {
    errors.push(`validation.dns.hostname.startDot key:${displayKey}`)
  }

  // Hostname can not be empty string
  if (val.length === 0) {
    errors.push(`validation.dns.hostname.empty key:${displayKey}`)
  }

  // Total length of the hostname can be at most 253 characters
  // (255 minus one for null-termination, and one for the trailing dot of a real FQDN)
  if (val.length > max) {
    errors.push(`validation.dns.hostname.tooLong key:${displayKey} max: ${max}`)
  }

  // Split the hostname with the dot and validate the element as label
  let labels = val.split(/\./)
  let label
  for (let i = 0; i < labels.length; i++) {
    label = labels[i]

    // Hostname can end with a dot (this makes it an explicitly fully qualified domain name)
    // so the last element of the labels can be empty string.
    if (i === labels.length - 1 && label === '') {
      continue
    }

    validateDnsLabel(label, displayKey, true, errors)
  }

  return errors
}
