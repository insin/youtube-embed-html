import assert from 'node:assert/strict'
import test from 'node:test'
import {parseHTML} from 'linkedom'
import {getYouTubeEmbed, renderYouTubeEmbed, withDefaults} from 'youtube-embed-html'

const video = {videoId: 'FfTT7mxGw8I', title: "Limmy's Homemade Show"}
const parse = html => parseHTML(`<!doctype html><html><body>${html}</body></html>`).document

test('aspectRatio controls the iframe viewport for both placeholder styles', () => {
  for (const legacy of [false, true]) {
    for (const aspectRatio of [16 / 9, 4 / 3, 9 / 16]) {
      const iframe = parse(renderYouTubeEmbed({...video, legacy, aspectRatio})).querySelector('iframe')
      assert.equal(iframe.style.getPropertyValue('aspect-ratio'), String(aspectRatio))
      assert.equal(iframe.style.width, '100%')
      const placeholder = parse(iframe.getAttribute('srcdoc'))
      assert.equal(placeholder.querySelector('.play').getAttribute('href'), iframe.getAttribute('src'))
    }
  }
  assert.equal(parse(renderYouTubeEmbed(video)).querySelector('iframe').style.getPropertyValue('aspect-ratio'), String(16 / 9))
  for (const aspectRatio of [0, -1, NaN, Infinity, '4/3']) {
    assert.throws(() => getYouTubeEmbed({...video, aspectRatio}), /positive finite number/)
  }
})

test('iframe attributes round-trip through HTML and extend the responsive style', () => {
  const options = {...video, aspectRatio: 4 / 3, iframeAttributes: {
    class: 'rounded video', id: 'classic', width: 640, height: 480,
    'data-caption': 'A "quote" & <tag>', style: 'width:640px;max-width:100%;border:0',
    'aria-label': 'Play this video', referrerpolicy: 'strict-origin-when-cross-origin',
    sandbox: 'allow-scripts allow-same-origin', hidden: false, allowfullscreen: false,
    credentialless: true, 'aria-hidden': false, 'data-preview': true,
    'data-unused': undefined, 'data-null': null,
  }}
  const iframe = parse(renderYouTubeEmbed(options)).querySelector('iframe')
  assert.equal(iframe.getAttribute('class'), 'rounded video')
  assert.equal(iframe.getAttribute('id'), 'classic')
  assert.equal(iframe.getAttribute('width'), '640')
  assert.equal(iframe.getAttribute('height'), '480')
  assert.equal(iframe.getAttribute('data-caption'), options.iframeAttributes['data-caption'])
  assert.equal(iframe.getAttribute('referrerpolicy'), options.iframeAttributes.referrerpolicy)
  assert.equal(iframe.getAttribute('sandbox'), options.iframeAttributes.sandbox)
  assert.equal(iframe.style.width, '640px')
  assert.equal(iframe.style.getPropertyValue('aspect-ratio'), String(4 / 3))
  assert.equal(iframe.hasAttribute('hidden'), false)
  assert.equal(iframe.hasAttribute('allowfullscreen'), false)
  assert.equal(iframe.hasAttribute('credentialless'), true)
  assert.equal(iframe.getAttribute('aria-hidden'), 'false')
  assert.equal(iframe.getAttribute('data-preview'), 'true')
  assert.equal(iframe.hasAttribute('data-unused'), false)
  assert.equal(iframe.hasAttribute('data-null'), false)
})

test('iframe source overrides, event handlers and invalid attribute names are rejected', () => {
  for (const name of ['src', 'srcdoc', 'SRCDOC', 'onload', 'ONLOAD', 'id" onload="alert(1)', 'a b']) {
    assert.throws(() => getYouTubeEmbed({...video, iframeAttributes: {[name]: 'value'}}), /Unsupported iframe attribute/)
  }
})

test('defaults merge iframe attributes and keep per-embed changes local', () => {
  const defaults = {aspectRatio: 4 / 3, iframeAttributes: {class: 'video', style: 'border:0'}}
  const getVideo = withDefaults(getYouTubeEmbed, defaults)
  defaults.iframeAttributes.class = 'changed'
  const configured = getVideo({...video, iframeAttributes: {id: 'first', class: undefined}})
  assert.equal(configured.class, 'video')
  assert.equal(configured.id, 'first')
  assert.match(configured.style, /;border:0$/)
  assert.equal(parse(renderYouTubeEmbed({...video, aspectRatio: 4 / 3})).querySelector('iframe').style.getPropertyValue('aspect-ratio'), String(4 / 3))
  configured.class = 'mutated'
  const next = getVideo({...video, iframeAttributes: {class: 'override', style: 'border:1px solid red'}})
  assert.equal(next.class, 'override')
  assert.match(next.style, /;border:1px solid red$/)
  assert.equal(next.id, undefined)
  assert.equal(getVideo(video).class, 'video')
})
