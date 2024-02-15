/* global $SD */
import _get from 'lodash/get'
import Canvas from './Canvas'
import GitHub from './GitHub'

const PLUGIN_ID = 'github-api-streamdeck-plugin'
const IS_URL_REGEX = new RegExp('^https?://.+')
const FETCH_INTERVAL = 120
const DEFAULT_BG_COLOR = '#cccccc'
const DEFAULT_BG_COLOR_ERROR = '#ff0000'

$SD.on('connected', onConnected)
$SD.on(`${PLUGIN_ID}.didReceiveSettings`, onDidReceiveSettings)
$SD.on(`${PLUGIN_ID}.willAppear`, onWillAppear)
$SD.on(`${PLUGIN_ID}.keyDown`, onKeyDown)
$SD.on(`${PLUGIN_ID}.willDisappear`, onWillDisappear)

// key: context, value: state (settings, github, canvas)
const contextState = {}

function onConnected(json) {
  console.info('onConnected', json)
}

function onDidReceiveSettings(json) {
  console.info('onDidReceiveSettings', json)
  setSettings(json.context, json.payload.settings)
  sendQuery(json.context)
}

function onWillDisappear(json) {
  console.info('onWillDisappear', json)
  const context = json.context
  clearInterval(contextState[context].intervalID)
}

function onWillAppear(json) {
  console.info('onWillAppear', json)
  const context = json.context
  setSettings(context, json.payload.settings)
  contextState[context].canvas = new Canvas(context)
  sendQuery(context)
  contextState[context].intervalID = setInterval(sendQuery, FETCH_INTERVAL * 1000, context)

}

function onKeyDown(json) {
  console.log('onKeyDown', json);
  const context = json.context
  const settings = contextState[context].settings
  console.info('onKeyDown', json, settings.on_key_press)
  switch (settings.on_key_press) {
    case 'open_first_url':
      findAndOpenUrls(context, true)
      return
    case 'open_all_urls':
      findAndOpenUrls(context)
      return
    case 'refetch':
    default:
      sendQuery(context)
  }
}

function setSettings(context, newSettings) {
  if (!contextState[context]) {
    contextState[context] = {
      settings: {},
      github: null,
      canvas: null
    }
  }
  contextState[context].settings = {
    access_token: null,
    host: null,
    graphql_query: null,
    badge_value_path: null,
    badge_show_condition: null,
    status_value_path: null,
    status_colors: null,
    on_key_press: 'refetch' // refetch, open_first_url, open_all_urls
  }
  const settings = contextState[context].settings
  if (newSettings) {
    if ((newSettings.access_token !== settings.access_token)
      || (newSettings.host !== settings.host)) {
      settings.access_token = newSettings.access_token
      settings.host = newSettings.host
      contextState[context].github = new GitHub(settings.access_token, settings.host)
    }
    if (newSettings.graphql_query !== settings.graphql_query) {
      settings.graphql_query = newSettings.graphql_query
    }
    if (newSettings.badge_value_path !== settings.badge_value_path) {
      settings.badge_value_path = newSettings.badge_value_path
    }
    if (newSettings.badge_show_condition !== settings.badge_show_condition) {
      settings.badge_show_condition = newSettings.badge_show_condition
    }
    if (newSettings.status_value_path !== settings.status_value_path) {
      settings.status_value_path = newSettings.status_value_path
    }
    if (newSettings.status_colors !== settings.status_colors) {
      try {
        settings.status_colors = JSON.parse(newSettings.status_colors)
      } catch (e) {
        settings.status_colors = {}
      }
      if (!settings.status_colors.default) {
        settings.status_colors.default = DEFAULT_BG_COLOR
      }
      if (!settings.status_colors.error) {
        settings.status_colors.error = DEFAULT_BG_COLOR_ERROR
      }
    }
    if (newSettings.on_key_press !== settings.on_key_press) {
      settings.on_key_press = newSettings.on_key_press
    }
  }
}

async function sendQuery(context) {
  console.log('sendQuery', context);
  if (!contextState[context]) {
    return
  }
  const settings = contextState[context].settings
  if (settings.graphql_query) {
    try {
      const last_response = await contextState[context].github.query(settings.graphql_query)
      const currentTime = new Date().toLocaleString()
      console.info('GraphQL response', last_response, currentTime)
      const badgeText = '' + _get(last_response, settings.badge_value_path, '')
      const statusText = _get(last_response, settings.status_value_path, 'default')
      const statusColor = _get(
        settings.status_colors,
        statusText,
        settings.status_colors.default || DEFAULT_BG_COLOR
      )
      console.info(`Badge value: "${badgeText}" (${settings.badge_value_path})`)
      console.info(`Status value: "${statusText}" (${settings.status_value_path})`)
      console.info('Status colors', settings.status_colors, statusColor)
      let should_show_badge = badgeText.length > 0
      if (settings.badge_show_condition) {
        try {
          should_show_badge = eval(`${JSON.stringify(badgeText)} ${settings.badge_show_condition};`)
          console.info(
            `Should show badge (${JSON.stringify(badgeText)} ${settings.badge_show_condition})`,
            should_show_badge
          )
        } catch (e) {
          console.error('Failed to evaluate badge condition')
        }
      }
      contextState[context].canvas.set({
        badgeText: should_show_badge ? badgeText : '',
        bgColor: '' + statusColor
      })
    } catch (e) {
      console.error(e)
      const errorColor = _get(settings.status_colors, 'error', DEFAULT_BG_COLOR_ERROR)
      contextState[context].canvas.set({ badgeText: '', bgColor: '' + errorColor })
    }
  }
}

function findAndOpenUrls(context, first_only = false, obj) {
  console.log('findAndOpenUrls', context, first_only, obj)
  try {
    if (!obj) {
      obj = contextState[context].github.getLastResponse()
    }
    for (const v in obj) {
      if (typeof obj[v] === 'string') {
        if (IS_URL_REGEX.test(obj[v])) {
          $SD.api.openUrl(context, obj[v])
          if (first_only) {
            return true
          }
        }
      } else if (typeof obj[v] === 'object') {
        const foundUrl = findAndOpenUrls(context, first_only, obj[v])
        if (foundUrl) {
          return true
        }
      }
    }
    return false
  } catch (e) {
    console.error(e)
    const settings = contextState[context].settings
    const errorColor = _get(settings.status_colors, 'error', DEFAULT_BG_COLOR_ERROR)
    contextState[context].canvas.set({ badgeText: '', bgColor: '' + errorColor })
  }
}
