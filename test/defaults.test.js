import assert from 'node:assert/strict'
import test from 'node:test'
import {parseHTML} from 'linkedom'
import {getYouTubeEmbed, renderYouTubeEmbed, withDefaults} from 'youtube-embed-html'
import {createYouTubeEmbed} from 'youtube-embed-html/dom'

const video = {videoId: 'FfTT7mxGw8I', title: "Limmy's Homemade Show"}
const parse = html => parseHTML(`<!doctype html><html><body>${html}</body></html>`).document

test('configured settings apply to attributes and standalone HTML', () => {
  const defaults = {thumbnailRes: 'maxres', copyLink: true, embedParams: {rel: 0}}
  const getVideo = withDefaults(getYouTubeEmbed, defaults)
  const renderVideo = withDefaults(renderYouTubeEmbed, defaults)
  const attributes = getVideo(video)
  const placeholder = parse(attributes.srcdoc)
  assert.match(placeholder.querySelector('img').getAttribute('src'), /\/maxresdefault.jpg$/)
  assert.ok(placeholder.querySelector('.copy'))
  assert.equal(new URL(attributes.src).searchParams.get('rel'), '0')
  assert.equal(new URL(attributes.src).searchParams.get('autoplay'), '1')
  assert.equal(parse(renderVideo(video)).querySelector('iframe').getAttribute('srcdoc'), attributes.srcdoc)
})

test('per-embed settings win, undefined is omitted, and parameters merge by key', () => {
  const getVideo = withDefaults(getYouTubeEmbed, {
    cookie: true, copyLink: true, thumbnailRes: 'maxres',
    embedParams: {rel: 0, controls: 1, autoplay: 1, hl: 'en'},
  })
  const options = Object.freeze({...video, cookie: false, copyLink: false, thumbnailRes: 'hq',
    embedParams: Object.freeze({start: 19, controls: 0, autoplay: 0, rel: undefined})})
  const attributes = getVideo(options)
  const params = new URL(attributes.src).searchParams
  assert.equal(new URL(attributes.src).hostname, 'www.youtube-nocookie.com')
  assert.equal(params.get('rel'), '0')
  assert.equal(params.get('controls'), '0')
  assert.equal(params.get('autoplay'), '0')
  assert.equal(params.get('hl'), 'en')
  assert.equal(params.get('start'), '19')
  const placeholder = parse(attributes.srcdoc)
  assert.match(placeholder.querySelector('img').getAttribute('src'), /\/hqdefault.jpg$/)
  assert.equal(placeholder.querySelector('.copy'), null)

  const configured = getVideo({...video, copyLink: undefined, thumbnailRes: undefined, embedParams: undefined})
  assert.ok(parse(configured.srcdoc).querySelector('.copy'))
  assert.match(parse(configured.srcdoc).querySelector('img').getAttribute('src'), /\/maxresdefault.jpg$/)
  assert.equal(new URL(configured.src).searchParams.get('rel'), '0')
  assert.equal(new URL(getVideo({...video, embedParams: {start: 0}}).src).searchParams.get('start'), '0')
})

test('defaults are captured independently and calls cannot mutate them', () => {
  const defaults = {thumbnailRes: 'maxres', embedParams: {rel: 0}}
  const getVideo = withDefaults(getYouTubeEmbed, defaults)
  defaults.thumbnailRes = 'sd'
  defaults.embedParams.rel = 1
  const attributes = getVideo(video)
  assert.match(parse(attributes.srcdoc).querySelector('img').getAttribute('src'), /\/maxresdefault.jpg$/)
  assert.equal(new URL(attributes.src).searchParams.get('rel'), '0')

  const inspectOptions = withDefaults(options => options, Object.freeze({embedParams: Object.freeze({rel: 0})}))
  const first = inspectOptions(video)
  first.embedParams.rel = 1
  assert.equal(inspectOptions(video).embedParams.rel, 0)
  assert.match(parse(getYouTubeEmbed(video).srcdoc).querySelector('img').getAttribute('src'), /\/hqdefault.jpg$/)
})

test('the same helper wraps the browser DOM function', t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', {value: parse(''), configurable: true})
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous)
    else delete globalThis.document
  })
  const createVideo = withDefaults(createYouTubeEmbed, {loading: 'eager', thumbnailRes: 'maxres'})
  const iframe = createVideo(video)
  assert.equal(iframe.tagName, 'IFRAME')
  assert.equal(iframe.getAttribute('loading'), 'eager')
  assert.match(parse(iframe.getAttribute('srcdoc')).querySelector('img').getAttribute('src'), /\/maxresdefault.jpg$/)
})
