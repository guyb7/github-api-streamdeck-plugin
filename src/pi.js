import GitHub from './GitHub'
import { onPresetSelect } from './presets'

/* global addDynamicStyles, $SD, Utils */
/* eslint-disable no-extra-boolean-cast */

// change this, if you want interactive elements act on any change, or while they're modified
const onchangeevt = 'onchange' // oninput, onchange
let sdpiWrapper = document.querySelector('.sdpi-wrapper')
let settings = {}
let context

$SD.on('connected', info => {
  console.info('connected', info)
  context = info.actionInfo.context
  addDynamicStyles($SD.applicationInfo.colors, 'connectElgatoStreamDeckSocket')
  $SD.api.getSettings()
})

$SD.on('didReceiveSettings', jsonObj => {
  console.info('didReceiveSettings', jsonObj)

  if (jsonObj && jsonObj.payload && jsonObj.payload.settings) {
    settings = jsonObj.payload.settings
    populateSettings(settings)
    GitHub.init(settings.access_token)
  }

  revealSdpiWrapper()
})

function populateSettings(settings) {
  // Populate settings form with the stored settings
  Object.keys(settings).map(settingId => {
    if (settingId && settingId != '') {
      const el = document.getElementById(settingId)
      if (el) {
        if (el.type === 'textarea') {
          el.value = settings[settingId]
          const maxl = el.getAttribute('maxlength')
          const labels = document.querySelectorAll(`[for='${el.id}']`)
          if (labels.length) {
            for (let x of labels) {
              x.textContent = maxl ? `${el.value.length}/${maxl}` : `${el.value.length}`
            }
          }
        } else if (el.type === 'checkbox') {
          el.checked = settings[settingId]
        } else if (el.type === 'file') {
          document.querySelector(`.sdpi-file-info[for="${el.id}"]`).textContent = trimFileName(
            settings[settingId]
          )
        } else {
          el.value = settings[settingId]
        }
      }
    } else {
      console.warn(`Could not find an element for the setting "${settingId}"`)
    }
  })
}

$SD.on('sendToPropertyInspector', jsonObj => {
  console.info('sendToPropertyInspector', jsonObj)
  const pl = jsonObj.payload
  if (pl.hasOwnProperty('error')) {
    sdpiWrapper.innerHTML = `<div class="sdpi-item">
        <details class="message caution">
          <summary class="${pl.hasOwnProperty('info') ? 'pointer' : ''}">${pl.error}</summary>
          ${pl.hasOwnProperty('info') ? pl.info : ''}
        </details>
      </div>`
  }
})

function revealSdpiWrapper() {
  sdpiWrapper && sdpiWrapper.classList.remove('hidden')
}

function sendValueToPlugin(value, param) {
  //console.log($SD, $SD.readyState, $SD.actionInfo, $SD.uuid, param, value)
  if ($SD.connection && $SD.connection.readyState === 1) {
    const json = {
      action: $SD.actionInfo['action'],
      event: 'sendToPlugin',
      context: $SD.uuid,
      payload: {
        [param]: value
      }
    }
    $SD.connection.send(JSON.stringify(json))
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add(navigator.userAgent.includes('Mac') ? 'mac' : 'win')
  prepareDOMElements(document)
  document
    .getElementById('presets')
    .addEventListener('change', e => onPresetSelect(e, settings, populateSettings))
})

/** the beforeunload event is fired, right before the PI will remove all nodes */
window.addEventListener('beforeunload', function (e) {
  e.preventDefault()
  sendValueToPlugin('propertyInspectorWillDisappear', 'property_inspector')
  // Don't set a returnValue to the event, otherwise Chromium with throw an error.  // e.returnValue = '';
})

/** CREATE INTERACTIVE HTML-DOM
 * where elements can be clicked or act on their 'change' event.
 * Messages are then processed using the 'handleSdpiItemClick' method below.
 */
function prepareDOMElements(baseElement) {
  baseElement = baseElement || document
  Array.from(baseElement.querySelectorAll('.sdpi-item-value')).forEach((el, i) => {
    const elementsToClick = ['BUTTON', 'OL', 'UL', 'TABLE', 'METER', 'PROGRESS', 'CANVAS'].includes(
      el.tagName
    )
    const evt = elementsToClick ? 'onclick' : onchangeevt || 'onchange'

    /** Look for <input><span> combinations, where we consider the span as label for the input
     *  we don't use `labels` for that, because a range could have 2 labels.
     */
    const inputGroup = el.querySelectorAll('input + span')
    if (inputGroup.length === 2) {
      const offs = inputGroup[0].tagName === 'INPUT' ? 1 : 0
      inputGroup[offs].textContent = inputGroup[1 - offs].value
      inputGroup[1 - offs]['oninput'] = function () {
        inputGroup[offs].textContent = inputGroup[1 - offs].value
      }
    }
    /** We look for elements which have an 'clickable' attribute
     *  we use these e.g. on an 'inputGroup' (<span><input type="range"><span>) to adjust the value of
     *  the corresponding range-control
     */
    Array.from(el.querySelectorAll('.clickable')).forEach((subel, subi) => {
      subel['onclick'] = function (e) {
        handleSdpiItemChange(e.target, subi)
      }
    })
    /** Just in case the found HTML element already has an input or change - event attached,
     *  we clone it, and call it in the callback, right before the freshly attached event
     */
    const cloneEvt = el[evt]
    const fn = Utils.debounce(function (e, i) {
      handleSdpiItemChange(e.target, i)
    }, 750)
    el[evt] = function (e) {
      if (cloneEvt) cloneEvt()
      fn(e, i)
    }
  })

  /**
   * You could add a 'label' to a textares, e.g. to show the number of charactes already typed
   * or contained in the textarea. This helper updates this label for you.
   */
  baseElement.querySelectorAll('textarea').forEach(e => {
    const maxl = e.getAttribute('maxlength')
    e.targets = baseElement.querySelectorAll(`[for='${e.id}']`)
    if (e.targets.length) {
      let fn = () => {
        for (let x of e.targets) {
          x.textContent = maxl ? `${e.value.length}/${maxl}` : `${e.value.length}`
        }
      }
      fn()
      e.onkeyup = fn
    }
  })

  baseElement.querySelectorAll('[data-open-url]').forEach(el => {
    const value = el.getAttribute('data-open-url')
    if (value) {
      el.onclick = event => {
        event.preventDefault()
        $SD.api.openUrl($SD.uuid, value)
      }
    }
  })
}

function handleSdpiItemChange(e, idx) {
  /** Following items are containers, so we won't handle clicks on them */

  if (['OL', 'UL', 'TABLE'].includes(e.tagName)) {
    return
  }

  /** SPANS are used inside a control as 'labels'
   * If a SPAN element calls this function, it has a class of 'clickable' set and is thereby handled as
   * clickable label.
   */
  if (e.tagName === 'SPAN') {
    const inp = e.parentNode.querySelector('input')
    var tmpValue

    // if there's no attribute set for the span, try to see, if there's a value in the textContent
    // and use it as value
    if (!e.hasAttribute('value')) {
      tmpValue = Number(e.textContent)
      if (typeof tmpValue === 'number' && tmpValue !== null) {
        e.setAttribute('value', 0 + tmpValue) // this is ugly, but setting a value of 0 on a span doesn't do anything
        e.value = tmpValue
      }
    } else {
      tmpValue = Number(e.getAttribute('value'))
    }

    if (inp && tmpValue !== undefined) {
      inp.value = tmpValue
    } else return
  }

  const selectedElements = []
  const isList = ['LI', 'OL', 'UL', 'DL', 'TD'].includes(e.tagName)
  const sdpiItem = e.closest('.sdpi-item')
  const sdpiItemGroup = e.closest('.sdpi-item-group')
  let sdpiItemChildren = isList
    ? sdpiItem.querySelectorAll(e.tagName === 'LI' ? 'li' : 'td')
    : sdpiItem.querySelectorAll('.sdpi-item-child > input')

  if (isList) {
    const siv = e.closest('.sdpi-item-value')
    if (!siv.classList.contains('multi-select')) {
      for (let x of sdpiItemChildren) x.classList.remove('selected')
    }
    if (!siv.classList.contains('no-select')) {
      e.classList.toggle('selected')
    }
  }

  if (sdpiItemChildren.length && ['radio', 'checkbox'].includes(sdpiItemChildren[0].type)) {
    e.value = e.checked
  }
  if (sdpiItemGroup && !sdpiItemChildren.length) {
    for (let x of ['input', 'meter', 'progress']) {
      sdpiItemChildren = sdpiItemGroup.querySelectorAll(x)
      if (sdpiItemChildren.length) break
    }
  }

  if (e.selectedIndex !== undefined) {
    if (e.tagName === 'SELECT') {
      sdpiItemChildren.forEach((ec, i) => {
        selectedElements.push({ [ec.id]: ec.value })
      })
    }
    idx = e.selectedIndex
  } else {
    sdpiItemChildren.forEach((ec, i) => {
      if (ec.classList.contains('selected')) {
        selectedElements.push(ec.textContent)
      }
      if (ec === e) {
        idx = i
        selectedElements.push(ec.value)
      }
    })
  }

  const returnValue = {
    key: e.id && e.id.charAt(0) !== '_' ? e.id : sdpiItem.id,
    value: isList
      ? e.textContent
      : e.value === 'true'
      ? true
      : e.value === 'false'
      ? false
      : e.value
      ? e.type === 'file'
        ? decodeURIComponent(e.value.replace(/^C:\\fakepath\\/, ''))
        : e.value
      : e.getAttribute('value'),
    group: sdpiItemGroup ? sdpiItemGroup.id : false,
    index: idx,
    selection: selectedElements,
    checked: e.checked
  }

  /** Just simulate the original file-selector:
   * If there's an element of class '.sdpi-file-info'
   * show the filename there
   */
  if (e.type === 'file') {
    const info = sdpiItem.querySelector('.sdpi-file-info')
    if (info) {
      info.textContent = trimFileName(returnValue.value)
    }
  }

  settings[returnValue.key] = returnValue.value

  if ($SD && $SD.connection) {
    console.log('setSettings(): ', settings)
    $SD.api.setSettings($SD.uuid, settings)
    GitHub.init(settings.access_token)
  }
}
