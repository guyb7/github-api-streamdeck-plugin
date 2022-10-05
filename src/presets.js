/* global $SD */

function getPreset(preset) {
  const presets = {
    prs_to_review: {
      graphql_query: `{
  prsToReview: search(query: "type:pr review-requested:@me state:open", type: ISSUE, first: 5) {
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
      badge_value_path: 'prsToReview.issueCount',
      badge_show_condition: '!== "0"',
      status_value_path: 'prsToReview.issueCount',
      status_colors: `{
  "default": "#aa9900",
  "error": "#ff3333",
  "0": "#666666"
}`,
      on_key_press: 'open_all_urls'
    },
    my_prs: {
      graphql_query: `{
  myOpenPrs: search(query: "type:pr author:@me is:open", type: ISSUE, first: 5) {
    issueCount
      edges {
        node {
          ... on PullRequest {
          title
          mergeable
          state
          url
        }
      }
    }
  }
  openPrsWithError: search(query: "type:pr author:@me is:open status:failure", type: ISSUE) {
    issueCount
  }
}`,
      badge_value_path: 'myOpenPrs.issueCount',
      badge_show_condition: '!== "0"',
      status_value_path: 'openPrsWithError.issueCount',
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
