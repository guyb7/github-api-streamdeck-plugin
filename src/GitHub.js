import { Octokit } from 'octokit'

export default class GitHub {
  isInitialized = false
  user = null
  octokit
  lastResponse = null

  constructor(access_token) {
    this.octokit = new Octokit({ auth: access_token })
    this.init()
  }

  async init() {
    try {
      const {
        viewer: { login }
      } = await this.octokit.graphql('{ viewer { login } }')
      console.info('Using the GitHub token of:', login)
      this.user = login
      this.isInitialized = true
    } catch (err) {
      console.error('Invalid GitHub token', err)
    }
  }

  async query(graphql_query) {
    if (!this.isInitialized) {
      await this.init()
    }
    this.lastResponse = await this.octokit.graphql(graphql_query)
    return this.lastResponse
  }

  getUser() {
    return this.user
  }

  getLastResponse() {
    return this.lastResponse
  }
}
