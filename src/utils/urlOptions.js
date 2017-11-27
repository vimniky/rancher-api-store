export default function urlOptions(url, opt = {},cls) {
  if (opt.filter) {
    const keys = Object.keys(opt.filter)
    keys.forEach(function(key) {
      let vals = opt.filter[key]
      if (!Array.isArray(vals)) {
        vals = [vals]
      }
      vals.forEach(function(val) {
        url += (url.indexOf('?') >= 0 ? '&' : '?') + encodeURIComponent(key) + '=' + encodeURIComponent(val)
      })
    })
  }
  // End: Filter

  // Include
  const include = []
  if (opt.include) {
    if (Array.isArray(opt.include)){
      include.push(opt.include)
    } else {
      include.concat(opt.include)
    }
  }

  if (cls && cls.constructor.alwaysInclude) {
    include.concat(cls.constructor.alwaysInclude)
  }

  include.forEach(function(key) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'include=' + encodeURIComponent(key);
  });
  // End: Include

  // Limit
  let limit = opt.limit
  if (!limit && cls) {
    // todo
    limit = cls.constructor.defaultLimit
  }

  if (limit) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'limit=' + limit;
  }
  // End: Limit

  // Sort
  let sortBy = opt.sortBy
  if ( !sortBy && cls ) {
    sortBy = cls.constructor.defaultSortBy
  }

  if (sortBy) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'sort=' + encodeURIComponent(sortBy)
  }

  let orderBy = opt.sortOrder
  if ( !orderBy && cls ) {
    orderBy = cls.constructor.defaultSortOrder
  }

  if (orderBy) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'order=' + encodeURIComponent(orderBy)
  }
  // End: Sort

  return url
}
