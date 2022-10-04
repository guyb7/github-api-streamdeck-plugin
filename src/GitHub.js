import { Octokit } from 'octokit'

let octokit
let user

const GitHub = {
  async init(access_token) {
    octokit = new Octokit({ auth: access_token })
    try {
      const {
        viewer: { login }
      } = await octokit.graphql('{ viewer { login } }')
      console.info('Using the GitHub token of:', login)
      user = login
    } catch (e) {
      console.error('Invalid GitHub token', e)
    }
  },

  async query(graphql_query) {
    const res = await octokit.graphql(graphql_query)
    return res
  }
}

export function getCurrentUser() {
  return user
}

export default GitHub
