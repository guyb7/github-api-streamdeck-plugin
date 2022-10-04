/* global $SD */

import { getCurrentUser } from './GitHub'

function getPreset(preset) {
  const user = getCurrentUser()
  const presets = {
    prs_to_review: {
      graphql_query: `{
  search(query: "type:pr state:open ${
    user ? 'review-requested:' + user : ''
  }", type: ISSUE, first: 5) {
    issueCount
    edges {
      node {
        ... on PullRequest {
          title
          url
        }
      }
    }
  }
}`,
      badge_value_path: 'search.issueCount',
      badge_show_condition: '!== "0"',
      status_value_path: 'search.issueCount',
      status_colors: `{
  "default": "#aa9900",
  "error": "#ff3333",
  "0": "#666666"
}`,
      on_key_press: 'open_all_urls'
    }
  }
  return presets[preset]
}

export function onPresetSelect(e, settings, populateSettingsFn) {
  const presetId = e.target.value
  const preset = getPreset(presetId)
  console.log('onPresetSelect', presetId, preset)
  if (preset) {
    populateSettingsFn({ ...preset, presets: '' })
    settings = { ...settings, ...preset }
    $SD.api.setSettings($SD.uuid, settings)
  }
}
