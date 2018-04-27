export default class Socket {
  constructor(url='', opt={}) {
    if (!url) {
      return
    }
    if (opt.hasOwnProperty('token')) {
      url = `${url}?token=${encodeURIComponent(opt.token)}`
    }
    this.initListeners()
    this.initSocket(url)
    this.bindSocketEvent()
    this.listeners = {}
    this.opt = opt || {}
  }

  initListeners() {
    this.listeners = {}
    return this
  }

  initSocket(url) {
    this.url = url
    this.socket = new WebSocket(url)
    return this
  }

  bindSocketEvent() {
    this.socket.onopen = (e) => {
      if (this.opt.reConnect === true) {
        this.stopHeartBeat()
        this.startHeartBeat()
      }
      this.trigger('ready', e)
      this.trigger('onStateChange', e)
    }
    this.socket.onerror = (e) => {
      this.trigger('error', e)
      this.trigger('onStateChange', e)
      this.close()
    }
    this.socket.onclose = (e) => {
      this.trigger('onclose', e)
      this.trigger('onStateChange', e)
    }
    this.socket.onmessage = (e) => {
      this.refreshServerTimer()
      this.trigger('onmessage', e)
    }
  }

  get socket() {
    return this.socket
  }

  isOffline() {
    return this.socket.readyState !== WebSocket.OPEN
  }

  on(e, fn) {

    if (this.listeners[e] && this.listeners[e].length) {
      if (this.listeners[e].indexOf(fn) === -1) {
        this.listeners[e].push(fn)
      }
    } else {
      this.listeners[e] = [fn]
    }

    return this
  }

  emit(method, info) {
    this.socket.send(JSON.stringify({
      method: method,
      request: info || '',
    }))

    return this
  }

  trigger(e) {

    if (this.listeners[e]) {
      this.listeners[e].map(item => {
        item.apply(this, [].slice.call(arguments, 1))
      })
    }

    return this
  }

  startHeartBeat() {
    this.heartBeatTimer = setInterval(() => {
      this.emit('heartBeat')
    }, 5000)
  }

  stopHeartBeat() {
    clearInterval(this.heartBeatTimer)
  }

  close() {
    clearTimeout(this.serverHeartBeatTimer)
    this.stopHeartBeat()
    this.socket.close()

    return this
  }

  refreshServerTimer() {
    clearTimeout(this.serverHeartBeatTimer)
    this.serverHeartBeatTimer = setTimeout(() => {
      this.trigger('disconnect')
      this.close()
      this.reConnect()
    }, 20000)
  }

  reConnect() {
    this.initSocket(this.url).bindSocketEvent()
    this.trigger('reconnect')
  }
}
