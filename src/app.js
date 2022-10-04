/* global $SD */
import _get from 'lodash/get'
import Canvas from './Canvas'
import GitHub from './GitHub'

const PLUGIN_ID = 'github-api-streamdeck-plugin'
const IS_URL_REGEX = new RegExp('^https?://.+')
const FETCH_INTERVAL = 60
const DEFAULT_BG_COLOR = '#cccccc'
const DEFAULT_BG_COLOR_ERROR = '#ff0000'

$SD.on('connected', onConnected)
$SD.on(`${PLUGIN_ID}.didReceiveSettings`, onDidReceiveSettings)
$SD.on(`${PLUGIN_ID}.willAppear`, onWillAppear)
$SD.on(`${PLUGIN_ID}.keyDown`, onKeyDown)

let context
const settings = {
  access_token: null,
  graphql_query: null,
  badge_value_path: null,
  badge_show_condition: null,
  status_value_path: null,
  status_colors: null,
  on_key_press: 'refetch' // refetch, open_first_url, open_all_urls
}

let last_response

function onConnected(json) {
  console.info('onConnected', json)
}

function onDidReceiveSettings(json) {
  console.info('onDidReceiveSettings', json)
  setSettings(json.payload.settings)
  sendQuery()
}

function onWillAppear(json) {
  console.info('onWillAppear', json)
  context = json.context
  setSettings(json.payload.settings)
  Canvas.init(context)
  sendQuery()
  setInterval(sendQuery, FETCH_INTERVAL * 1000)
}

function onKeyDown(json) {
  console.info('onKeyDown', json, settings.on_key_press)
  switch (settings.on_key_press) {
    case 'open_first_url':
      findAndOpenUrls(true)
      return
    case 'open_all_urls':
      findAndOpenUrls()
      return
    case 'refetch':
    default:
      sendQuery()
  }
}

function setSettings(newSettings) {
  if (newSettings) {
    if (newSettings.access_token !== settings.access_token) {
      settings.access_token = newSettings.access_token
      GitHub.init(newSettings.access_token)
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

async function sendQuery() {
  if (settings.graphql_query) {
    try {
      last_response = await GitHub.query(settings.graphql_query)
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
      if (badgeText) {
        let should_show_badge = true
        if (settings.badge_show_condition) {
          try {
            should_show_badge = eval(
              `${JSON.stringify(badgeText)} ${settings.badge_show_condition};`
            )
            console.info(
              `Should show badge (${JSON.stringify(badgeText)} ${settings.badge_show_condition})`,
              should_show_badge
            )
          } catch (e) {
            console.error('Failed to evaluate badge condition')
          }
        }
        Canvas.set({ badgeText: should_show_badge ? badgeText : '', bgColor: '' + statusColor })
      }
    } catch (e) {
      console.error(e)
      const errorColor = _get(settings.status_colors, 'error', DEFAULT_BG_COLOR_ERROR)
      Canvas.set({ badgeText: '', bgColor: '' + errorColor })
    }
  }
}

function findAndOpenUrls(first_only = false, obj = last_response) {
  for (const v in obj) {
    if (typeof obj[v] === 'string') {
      if (IS_URL_REGEX.test(obj[v])) {
        $SD.api.openUrl(context, obj[v])
        if (first_only) {
          return true
        }
      }
    } else if (typeof obj[v] === 'object') {
      const foundUrl = findAndOpenUrls(first_only, obj[v])
      if (foundUrl) {
        return true
      }
    }
  }
  return false
}
