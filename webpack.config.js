const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: {
    app: './src/app.js',
    pi: './src/pi.js'
  },
  target: 'web',
  output: {
    filename: '[name].js',
    path: __dirname + '/dist',
    clean: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'src',
          globOptions: {
            ignore: ['src/*.js']
          }
        }
      ]
    })
  ]
}
