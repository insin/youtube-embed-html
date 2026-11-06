import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import {parseHTML} from 'linkedom'
import {getYouTubeEmbed, renderYouTubeEmbed} from 'youtube-embed-html'
import {createYouTubeEmbed} from 'youtube-embed-html/dom'

const video = {videoId: 'FfTT7mxGw8I', title: "Limmy's Homemade Show"}
const parse = html => parseHTML(`<!doctype html><html><body>${html}</body></html>`).document

test('default embeds provide an accessible thumbnail placeholder', () => {
  const attributes = getYouTubeEmbed(video)
  const placeholder = parse(attributes.srcdoc)
  assert.equal(placeholder.querySelector('img').getAttribute('src'),
    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`)
  assert.equal(placeholder.querySelector('img').getAttribute('alt'), video.title)
  assert.equal(placeholder.querySelector('.title').textContent, video.title)
  assert.equal(placeholder.querySelector('.play').getAttribute('href'), attributes.src)
  assert.equal(placeholder.querySelector('.play').getAttribute('aria-label'), `Play ${video.title}`)
  assert.equal(attributes.title, video.title)
  assert.equal(attributes.allowfullscreen, true)
  assert.equal(new URL(attributes.src).searchParams.get('autoplay'), '1')
  assert.equal(placeholder.querySelector('.copy'), null)
  assert.equal(placeholder.querySelectorAll('script').length, 0)
})

test('legacy mode uses the classic play button and ignores copyLink', () => {
  const current = parse(getYouTubeEmbed(video).srcdoc)
  const attributes = getYouTubeEmbed({...video, legacy: true, copyLink: true})
  const legacy = parse(attributes.srcdoc)
  assert.equal(current.querySelector('.button svg').getAttribute('viewBox'), '0 0 67 60')
  assert.equal(legacy.querySelector('.button svg').getAttribute('viewBox'), '0 0 68 48')
  assert.equal(legacy.querySelector('.title').textContent, video.title)
  assert.equal(legacy.querySelector('.play').getAttribute('href'), attributes.src)
  assert.equal(legacy.querySelector('.copy'), null)
  assert.equal(legacy.querySelector('.toast'), null)
  assert.equal(legacy.querySelectorAll('script').length, 0)
  assert.equal(attributes.allow.split(';').includes('clipboard-write'), false)
})

test('the watch link is available in both styles and noLink removes it independently of copyLink', () => {
  for (const legacy of [false, true]) {
    const linked = parse(getYouTubeEmbed({...video, legacy, embedParams: {start: 19}}).srcdoc)
    const link = linked.querySelector('.woyt')
    assert.equal(link.getAttribute('href'), `https://www.youtube.com/watch?v=${video.videoId}&t=19s`)
    assert.equal(link.getAttribute('target'), '_blank')
    assert.ok(link.getAttribute('rel').split(' ').includes('noopener'))
    const attributes = getYouTubeEmbed({...video, legacy, noLink: true, copyLink: true})
    const unlinked = parse(attributes.srcdoc)
    assert.equal(unlinked.querySelector('.woyt'), null)
    assert.equal(Boolean(unlinked.querySelector('.copy')), !legacy)
    assert.equal(attributes.allow.split(';').includes('clipboard-write'), !legacy)
    assert.equal(unlinked.querySelector('.play').getAttribute('href'), attributes.src)
  }
})

test('cookie mode selects the player host consistently for the iframe and play link', () => {
  for (const [cookie, hostname] of [[false, 'www.youtube-nocookie.com'], [true, 'www.youtube.com']]) {
    const attributes = getYouTubeEmbed({...video, cookie})
    assert.equal(new URL(attributes.src).hostname, hostname)
    assert.equal(new URL(attributes.src).pathname, `/embed/${video.videoId}`)
    assert.equal(parse(attributes.srcdoc).querySelector('.play').getAttribute('href'), attributes.src)
  }
})

test('loading applies to both the iframe and its thumbnail', () => {
  for (const loading of ['lazy', 'eager']) {
    const iframe = parse(renderYouTubeEmbed({...video, loading})).querySelector('iframe')
    assert.equal(iframe.getAttribute('loading'), loading)
    assert.equal(parse(iframe.getAttribute('srcdoc')).querySelector('img').getAttribute('loading'), loading)
  }
})

test('player parameters preserve explicit zeroes and omit undefined values', () => {
  const attributes = getYouTubeEmbed({...video, embedParams: {
    autoplay: 0, start: 0, end: 22, controls: 0, rel: '0', hl: undefined,
  }})
  const params = new URL(attributes.src).searchParams
  assert.equal(params.get('autoplay'), '0')
  assert.equal(params.get('start'), '0')
  assert.equal(params.get('end'), '22')
  assert.equal(params.get('controls'), '0')
  assert.equal(params.get('rel'), '0')
  assert.equal(params.has('hl'), false)
  const placeholder = parse(attributes.srcdoc)
  assert.equal(placeholder.querySelector('.play').getAttribute('href'), attributes.src)
  assert.equal(placeholder.querySelector('.woyt').getAttribute('href'), `https://www.youtube.com/watch?v=${video.videoId}`)
})

test('a video ID is required', () => {
  for (const videoId of ['', '   ', undefined, null, 123, {}, [], new String(''), new String('   ')]) {
    assert.throws(() => getYouTubeEmbed({...video, videoId}), /videoId must be a non-empty string/)
  }
})

test('video IDs accept primitive and boxed strings across realms', () => {
  const expected = getYouTubeEmbed(video)
  for (const videoId of [video.videoId, new String(video.videoId), vm.runInNewContext(`new String('${video.videoId}')`)]) {
    assert.deepEqual(getYouTubeEmbed({...video, videoId}), expected)
  }
})

test('standalone HTML survives both layers of HTML parsing', () => {
  const options = {...video, copyLink: true, title: `A & B <script>alert('x')</script> "quoted"`,
    thumbnail: 'https://example.com/a.jpg?x=1&y=" onerror="alert(1)',
    embedParams: {start: 19, origin: 'https://example.com/?a=1&b=2'}}
  const iframe = parse(renderYouTubeEmbed(options)).querySelector('iframe')
  const attributes = getYouTubeEmbed(options)
  assert.equal(iframe.getAttribute('title'), options.title)
  assert.equal(iframe.getAttribute('srcdoc'), attributes.srcdoc)
  assert.equal(iframe.getAttribute('src'), attributes.src)
  const placeholder = parse(iframe.getAttribute('srcdoc'))
  assert.equal(placeholder.querySelector('.title').textContent, options.title)
  assert.equal(placeholder.querySelector('img').getAttribute('src'), options.thumbnail)
  assert.equal(placeholder.querySelector('img').hasAttribute('onerror'), false)
  assert.equal(placeholder.querySelector('.play').getAttribute('href'), attributes.src)
  assert.equal(placeholder.querySelectorAll('script').length, 1)
  assert.equal(new URL(placeholder.querySelector('.woyt').getAttribute('href')).searchParams.get('t'), '19s')
})

test('video IDs cannot escape the embed path or thumbnail attributes', () => {
  const options = {...video, videoId: '../evil?x="/><script>alert(1)</script>'}
  const attributes = getYouTubeEmbed(options)
  assert.equal(new URL(attributes.src).pathname, '/embed/' + encodeURIComponent(options.videoId))
  const placeholder = parse(attributes.srcdoc)
  assert.equal(placeholder.querySelectorAll('script').length, 0)
  assert.equal(placeholder.querySelectorAll('img').length, 1)
  assert.equal(placeholder.querySelector('.play').getAttribute('href'), attributes.src)
})

test('JavaScript callers cannot inject attributes through a loading value', () => {
  const loading = 'lazy" onload="alert(1)'
  const iframe = parse(renderYouTubeEmbed({...video, loading})).querySelector('iframe')
  const image = parse(iframe.getAttribute('srcdoc')).querySelector('img')
  assert.equal(iframe.getAttribute('loading'), loading)
  assert.equal(image.getAttribute('loading'), loading)
  assert.equal(iframe.hasAttribute('onload'), false)
  assert.equal(image.hasAttribute('onload'), false)
})

test('all documented thumbnail resolution aliases map to YouTube filenames', () => {
  for (const [prefix, aliases] of [
    ['', [120, '120', 'default']], ['mq', [320, '320', 'medium', 'mq']],
    ['hq', [480, '480', 'high', 'hq']], ['sd', [640, '640', 'standard', 'sd']],
    ['maxres', [1280, '1280', 'maxres']],
  ]) {
    for (const thumbnailRes of aliases) {
      const placeholder = parse(getYouTubeEmbed({...video, thumbnailRes}).srcdoc)
      assert.equal(placeholder.querySelector('img').getAttribute('src'),
        `https://i.ytimg.com/vi/${video.videoId}/${prefix}default.jpg`)
    }
  }
})

test('alternate screenshots support numeric and string selectors', () => {
  for (const thumbnail of [1, '1', 2, '2', 3, '3']) {
    const placeholder = parse(getYouTubeEmbed({...video, thumbnail, thumbnailRes: 'sd'}).srcdoc)
    assert.equal(placeholder.querySelector('img').getAttribute('src'),
      `https://i.ytimg.com/vi/${video.videoId}/sd${thumbnail}.jpg`)
  }
})

test('DOM helper produces the same iframe as standalone HTML', t => {
  const document = parse('')
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', {value: document, configurable: true})
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous)
    else delete globalThis.document
  })
  const cases = [
    video,
    {...video, copyLink: true, noLink: true},
    {...video, legacy: true, copyLink: true},
    {...video, cookie: true, loading: 'eager', thumbnail: 3, embedParams: {start: 19}},
    {...video, title: 'A <title> & "quotes"', thumbnail: 'https://example.com/poster.jpg?a=1&b=2'},
    {...video, aspectRatio: 4 / 3, iframeAttributes: {
      class: 'video', id: 'classic', width: 640, height: 480, style: 'max-width:640px',
      allowfullscreen: false, hidden: true, 'aria-hidden': false, 'data-preview': true,
    }},
  ]
  for (const options of cases) {
    const actual = createYouTubeEmbed(options)
    const expected = parse(renderYouTubeEmbed(options)).querySelector('iframe')
    const attrs = element => Object.fromEntries([...element.attributes].map(({name, value}) => [name, value]))
    assert.deepEqual(attrs(actual), attrs(expected))
  }
})

test('copy script copies the timestamped URL and reports success and failure', async () => {
  const placeholder = parse(getYouTubeEmbed({...video, copyLink: true, noLink: true, embedParams: {start: 19}}).srcdoc)
  const button = placeholder.querySelector('.copy')
  const toast = placeholder.querySelector('.toast')
  const copied = []
  toast.getAnimations = () => []
  const navigator = {clipboard: {writeText: async value => copied.push(value)}}
  let clearToast
  vm.runInNewContext(placeholder.querySelector('script').textContent, {
    document: placeholder, navigator,
    setTimeout: callback => { clearToast = callback }, clearTimeout: () => {},
  })
  assert.equal(button.parentElement.hidden, false)
  await button.onclick()
  assert.deepEqual(copied, [`https://www.youtube.com/watch?v=${video.videoId}&t=19s`])
  assert.equal(toast.textContent, 'Link copied to clipboard')
  clearToast()
  assert.equal(toast.textContent, '')
  navigator.clipboard.writeText = async () => { throw new Error('Permission denied') }
  await button.onclick()
  assert.equal(toast.textContent, 'Could not copy link')
})

test('copy control remains hidden when clipboard API is unavailable', () => {
  const placeholder = parse(getYouTubeEmbed({...video, copyLink: true}).srcdoc)
  vm.runInNewContext(placeholder.querySelector('script').textContent, {document: placeholder, navigator: {}})
  assert.equal(placeholder.querySelector('.copy-wrap').hidden, true)
})
