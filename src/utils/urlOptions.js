export default function urlOptions(url, opt = {}, Model) {
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

  if (Model && Model.alwaysInclude) {
    include.concat(Model.alwaysInclude)
  }

  include.forEach(function(key) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'include=' + encodeURIComponent(key)
  });
  // End: Include

  // Limit
  let limit = opt.limit
  if (!limit && Model) {
    // todo
    limit = Model.defaultLimit
  }

  if (limit) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'limit=' + limit
  }
  // End: Limit

  // Sort
  let sortBy = opt.sortBy
  if (!sortBy && Model) {
    sortBy = Model.defaultSortBy
  }

  if (sortBy) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'sort=' + encodeURIComponent(sortBy)
  }

  let orderBy = opt.sortOrder
  if (!orderBy && Model) {
    orderBy = Model.defaultSortOrder
  }

  if (orderBy) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'order=' + encodeURIComponent(orderBy)
  }
  // End: Sort

  return url
}
