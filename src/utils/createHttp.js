const axios = require('axios')
const merge = require('lodash/merge')

export default function (options) {
  // See `https://github.com/mzabriskie/axios` for details
  const instance = axios.create(merge({
    timeout: 30000,
    baseURL: '/',
    withCredentials: false,
    headers: {
      post: {
        'Content-Type': 'application/json',
      },
      Accept: 'application/json',
    },
    withCredentials: true,
    responseType: 'json',
    validateStatus: function (status) {
      return status >= 200 && status < 300; // default
    },
    maxRedirects: 5, // default
  }, options))

  return  instance
}
