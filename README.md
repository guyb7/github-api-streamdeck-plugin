# GitHub API Plugin for the Elgato Stream Deck

Show data from GitHub's API.

## Usage

1. Generate a GitHub [personal access token](https://github.com/settings/tokens) (you can allow only the scopes required for your query)
2. Put the token under "GitHub Access Token" in the settings
3. Select one of the presets and modify the settings to your liking

## Settings Documentation

### `GitHub Access Token`

Log into your GitHub account and [generate an access token](https://github.com/settings/tokens) with the proper permissions.

### `GraphQL Query`

The GraphQL query that will be sent to GitHub's API. The query will be refetched in the background every 60 seconds and after every settings change.

Useful links:

- [About the GraphQL API](https://docs.github.com/en/graphql/overview/about-the-graphql-api)
- [Explorer](https://docs.github.com/en/graphql/overview/explorer)
- [Search API](https://docs.github.com/en/rest/search)

### `Badge`

Optionally show a counter in the bottom-right corner. Used for 1-2 digit numbers, won't work well with texts.

- `Value path` is the path to the value in the query response (Uses [Lodash's get()](https://lodash.com/docs/#get) syntax). The value will always be cast to a string.
- `Show condition` is a JavaScript expression which should resolve to a boolean.
  For example, the condition `!== "0"` will not show the badge if the value is `"0"`. This is basically what happens under the hood:

```js
eval(`${badgeValue} ${badgeCondition};`)
```

### `Status Colors`

Control the color of the icon depending on the query response.

- `Value path` - same as the badge value path
- `Colors dictionary` is a JSON dictionary. The special values are `default` and `error`, and the rest are the status values:

```json
{
  "default": "#aa9900",
  "error": "#ff3333",

  "0": "#66ff66",
  "any-other-value-that-can-be-returned": "#666666"
}
```

### `On Press`

What should happen after pressing the Stream Deck button:

- `Re-fetch data` will send the query immediatelly
- `Open First URL` will find the first URL value in the response and open it in your browser
- `Open All URLs` will open all URL values in the response in your browser

## Presets

### Pull requests to review

Shows the number of pull requests you were requested to review. If you have at least 1 PR, the background will be yellow. Pressing the button will open the first 5 PRs.

![crs](https://user-images.githubusercontent.com/3589252/194178900-5dd09090-5b81-4704-878a-57ad515c222a.png)

### My pull requests

Shows the number of open pull requests you're the author of. If you have at least 1 failing PR, the background will be yellow. Pressing the button will open the first 5 PRs.

![prs](https://user-images.githubusercontent.com/3589252/194178838-e419af31-6477-4172-8e8b-615963da7a59.png)

### Repository status

Shows the status of the last commit on the default branch of a repository (edit the repo owner/name fields in the query). The background will be red on error/failure, yellow on pending, and green on success/expected. Pressing the button will open the first associated PR of the commit.

![status](https://user-images.githubusercontent.com/3589252/194178868-0b09dea2-56cf-48c8-978a-b36d37d8bbb9.png)

## Development

1. Create a symlink from the `dist/` directory to the plugins directory:

```
ln -s $(pwd)/dist ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.github.guyb7.github-api-streamdeck-plugin.sdPlugin
```

2. Build the plugin:

```
npm run build
```

3. Reload the Stream Deck application, and then the app will be available under "Custom > GitHub API"

To debug:

1. Run `defaults write com.elgato.StreamDeck html_remote_debugging_enabled -bool YES`
2. Reload the Stream Deck application
3. Open [http://localhost:23654/](http://localhost:23654/)

## Publish

1. Bump version
2. `cd ~/Library/Application Support/com.elgato.StreamDeck/Plugins`
3. `./DistributionTool -b -i com.github.guyb7.github-api-streamdeck-plugin.sdPlugin -o ~/Desktop`
4. Email `streamdeck.elgato@corsair.com` with release notes
