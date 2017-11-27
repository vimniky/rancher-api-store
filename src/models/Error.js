import  Resource from './Resource'

class Error extends Resource {
  constructor(...args) {
    super(...args)
    this.type = 'error'
  }
}

export default Error
