// Copy the headers from `src` into the object `dest`
// including ones with a value of undefined, so they
// can be removed later by someone calling applyHeaders.
export function copyHeaders(src, dest) {
  if (!src || typeof src !== 'object') {
    return
  }

  Object.keys(src).forEach(function(key) {
    const val = src[key]
    const normalizedKey = key.toLowerCase()
    dest[normalizedKey] = val
  })
}

// Apply the headers from `src` into the object `dest`
export function applyHeaders(src, dest, copyUndefined) {
  if (!src || typeof src !== 'object') {
    return
  }

  Object.keys(src).forEach(function(key) {
    const val = src[key]
    const normalizedKey = key.toLowerCase()
    if (val === undefined && copyUndefined !== true) {
      delete dest[normalizedKey]
    } else {
      dest[normalizedKey] = val
    }
  })
}

