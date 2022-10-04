import GITHUB_SVG_PATH from './images/githubPath'

let context

const CANVAS_SIZE = 144
const BADGE_SIZE = 28
const BADGE_PADDING = 8
const BADGE_FONT_SIZE = 32

let _bgColor = '#ffffff'
let _badgeText = ''
let _badgeColor = '#ffffff'
let _badgeBgColor = '#eb0014'

const Canvas = {
  init(sdContext) {
    context = sdContext
  },

  set({ bgColor, badgeText, badgeColor, badgeBgColor }) {
    if (bgColor) {
      _bgColor = bgColor
    }
    if (badgeColor) {
      _badgeColor = badgeColor
    }
    if (badgeBgColor) {
      _badgeBgColor = badgeBgColor
    }
    if (typeof badgeText !== 'undefined') {
      _badgeText = badgeText
    }
    this.draw()
  },

  draw() {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const path = new Path2D(GITHUB_SVG_PATH)
    ctx.fillStyle = _bgColor
    ctx.fill(path)

    if (_badgeText.length > 0) {
      const badgeCenter = CANVAS_SIZE - BADGE_PADDING - BADGE_SIZE
      // Circle
      ctx.beginPath()
      ctx.arc(badgeCenter, badgeCenter, BADGE_SIZE, 0, Math.PI * 2)
      ctx.fillStyle = _badgeBgColor
      ctx.fill()

      // Text
      ctx.fillStyle = _badgeColor
      ctx.font = `${BADGE_FONT_SIZE}px Helvetica, Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(_badgeText, badgeCenter, badgeCenter)
    }

    const finalImage = canvas.toDataURL('image/png')
    $SD.api.setImage(context, finalImage)
  }
}

export default Canvas
