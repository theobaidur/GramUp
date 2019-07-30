const replyToRequest = (sender, req_id, data) => {
  console.log('reply to', req_id, data)
  if (sender.tab) {
    return chrome.tabs.sendMessage(sender.tab.id, { req_id, ...data })
  } else {
    return chrome.runtime.sendMessage(sender.id, { req_id, ...data })
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const { username, password } = await getCredentials()

  window.instagram = new Instagram()
  window.instagram.history = new ChromeHistory()
  window.instagram.confirmator = new AllowAll()
  window.stats = new InstagramStats(window.instagram)

  if (!username || !password) {
    console.log(`No credentials!`)
  } else {
    const user = await instagram.login(username, password)
  }

  chrome.runtime.onConnectExternal.addListener(async (port) => {
    console.log('connect', port)

    port.onMessage.addListener(async (message, sender) => {
      console.log('message', message)
      console.log('sender', sender)

      const sendResponse = (data) => port.postMessage(data)

      const { method, params } = message

      try {
        if (method === 'ping') {
          return sendResponse({ status: 'ok', pong: 'pong' })
        }

        if (method === 'stats') {
          await stats.updateValues()

          const data = await stats.getInfo()

          return sendResponse({ status: 'ok', data })
        }

        if (method === 'login') {
          const [ username, password ] = params || []

          try {
            const user = await instagram.login(username, password, true)

            return sendResponse({ status: 'ok', user })
          } catch (err) {
            console.error(err)
            const { message, response } = err
            const { data, headers } = response
            return sendResponse({ status: 'error', error: { message, response: data, headers }})
          }
        }

        if (method === 'login_2fa') {
          const [ username, password, verification_code, two_factor_data ] = params || []

          try {
            const user = await instagram.verify_2fa(username, password, verification_code, two_factor_data)

            return sendResponse({ status: 'ok', user })
          } catch (err) {
            console.error(err)
            const { message, response } = err
            const { data, headers } = response
            return sendResponse({ status: 'error', error: { message, response: data, headers }})
          }
        }

        if (method === 'exit') {
          // TODO: logout
          instagram.user = {}
          return sendResponse({ status: 'ok', user: instagram.user })
        }

        if (method === 'check_login') {
          try {
            const info = await instagram.callMethod('get_user_info', instagram.user.username)

            instagram.user = info.user
          } catch (error) {
            console.log(`Needs relogin`, error)

            const { username, password } = await getCredentials()
            instagram.user = await instagram.login(username, password, true)
          }

          return sendResponse({ status: 'ok', user: instagram.user })
        }

        if (method === 'get_history') {
          const history = await getHistory(...params)

          return sendResponse({ status: 'ok', history })
        }

        if (!instagram) {
          return sendResponse({ status: 'error', error: { message: 'Not initialized' } })
        }

        const res = await instagram.callMethod(method, ...params)

        return sendResponse(res)
      } catch (err) {
        console.error(err)
        const { message, response } = err
        const { data, headers } = response
        return sendResponse({ status: 'error', error: { message, response: data, headers }})
      }
    });
  });

  chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {

    console.log('message', message)
    console.log('sender', sender)

    const { method, params } = message


    try {
      if (method === 'ping') {
        return sendResponse({ status: 'ok', pong: 'pong' })
      }

      if (method === 'stats') {
        await stats.updateValues()

        const data = await stats.getInfo()

        return sendResponse({ status: 'ok', data })
      }

      if (method === 'login') {
        const [ username, password ] = params || []

        try {
          const user = await instagram.login(username, password, true)

          return sendResponse({ status: 'ok', user })
        } catch (err) {
          console.error(err)
          const { message, response } = err
          const { data, headers } = response
          return sendResponse({ status: 'error', error: { message, response: data, headers }})
        }
      }

      if (method === 'login_2fa') {
        const [ username, password, verification_code, two_factor_data ] = params || []

        try {
          const user = await instagram.verify_2fa(username, password, verification_code, two_factor_data)

          return sendResponse({ status: 'ok', user })
        } catch (err) {
          console.error(err)
          const { message, response } = err
          const { data, headers } = response
          return sendResponse({ status: 'error', error: { message, response: data, headers }})
        }
      }

      if (method === 'exit') {
        // TODO: logout
        instagram.user = {}
        return sendResponse({ status: 'ok', user: instagram.user })
      }

      if (method === 'check_login') {
        try {
          const info = await instagram.callMethod('get_user_info', instagram.user.username)

          instagram.user = info.user
        } catch (error) {
          console.log(`Needs relogin`, error)

          const { username, password } = await getCredentials()
          instagram.user = await instagram.login(username, password, true)
        }

        return sendResponse({ status: 'ok', user: instagram.user })
      }

      if (method === 'get_history') {
        const history = await getHistory(...params)

        return sendResponse({ status: 'ok', history })
      }

      if (!instagram) {
        return sendResponse({ status: 'error', error: { message: 'Not initialized' } })
      }

      const res = await instagram.callMethod(method, ...params)

      return sendResponse(res)
    } catch (err) {
      console.error(err)
      const { message, response } = err
      const { data, headers } = response
      return sendResponse({ status: 'error', error: { message, response: data, headers }})
    }

  });

  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('message', message)
    console.log('sender', sender)

    const { req_id, method, params } = message

    try {
      if (method === 'login') {
        const [ username, password ] = params || []

        try {
          const user = await instagram.login(username, password, true)

          return replyToRequest(sender, req_id, { status: 'ok', user })
        } catch (err) {
          console.error(err)
          const { message, response } = err
          const { data, headers } = response || {}
          return replyToRequest(sender, req_id, { status: 'error', error: { message, response: data, headers }})
        }
      }

      if (method === 'login_2fa') {
        const [ username, password, verification_code, two_factor_data ] = params || []

        try {
          const user = await instagram.verify_2fa(username, password, verification_code, two_factor_data)

          return replyToRequest(sender, req_id, { status: 'ok', user })
        } catch (err) {
          console.error(err)
          const { message, response } = err
          const { data, headers } = response
          return replyToRequest(sender, req_id, { status: 'error', error: { message, response: data, headers }})
        }
      }


      if (method === 'exit') {
        // TODO: logout
        // instagram.user = {}
        const logout = await instagram.callMethod('logout')
        return replyToRequest(sender, req_id, { status: 'ok', user: instagram.user, logout })
      }

      if (method === 'check_login') {
        return replyToRequest(sender, req_id, { status: 'ok', user: instagram.user })
      }

      if (method === 'get_history') {
        return replyToRequest(sender, req_id, { status: 'ok', history })
      }

      if (!instagram) {
        return replyToRequest(sender, req_id, { status: 'error', error: { message: 'Not initialized' } })
      }

      const res = await instagram.callMethod(method, ...params)

      return replyToRequest(sender, req_id, res)
    } catch (err) {
      console.error(err)
      const { message, response } = err
      const { data, headers } = response
      return replyToRequest(sender, req_id, { status: 'error', error: { message, response: data, headers }})
    }

  })

}, false);
