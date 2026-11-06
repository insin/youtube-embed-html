import {getYouTubeEmbed, renderYouTubeEmbed, withDefaults, type YouTubeEmbedAttributes, type YouTubeEmbedDefaults} from 'youtube-embed-html'
import {createYouTubeEmbed} from 'youtube-embed-html/dom'

const video = {videoId: 'FfTT7mxGw8I', title: 'A video'}
const defaults: YouTubeEmbedDefaults = {
  thumbnailRes: 'maxres', aspectRatio: 4 / 3, embedParams: {rel: 0},
  iframeAttributes: {class: 'video', width: 640, allowfullscreen: false, 'aria-hidden': 'false'},
}

const renderVideo = withDefaults(renderYouTubeEmbed, defaults)
const html: string = renderVideo(video)
const getVideo = withDefaults(getYouTubeEmbed, defaults)
const attributes: YouTubeEmbedAttributes = getVideo(video)
const createVideo = withDefaults(createYouTubeEmbed, defaults)
const iframe: HTMLIFrameElement = createVideo(video)
void [html, attributes, iframe]

// @ts-expect-error Every embed requires a title.
renderVideo({videoId: video.videoId})
// @ts-expect-error Every embed requires a video ID.
renderVideo({title: video.title})
// @ts-expect-error Video IDs belong to individual embeds, not reusable defaults.
withDefaults(renderYouTubeEmbed, {videoId: video.videoId})
// @ts-expect-error Titles belong to individual embeds, not reusable defaults.
withDefaults(renderYouTubeEmbed, {title: video.title})
// @ts-expect-error Thumbnail resolutions retain their literal types.
withDefaults(renderYouTubeEmbed, {thumbnailRes: 'ultra'})
// @ts-expect-error A wrapped HTML renderer returns a string.
const wrongReturn: HTMLIFrameElement = renderVideo(video)
void wrongReturn

// @ts-expect-error Aspect ratios are numeric width/height values.
getYouTubeEmbed({...video, aspectRatio: '4/3'})
// @ts-expect-error The renderer supplies the iframe source.
renderYouTubeEmbed({...video, iframeAttributes: {src: 'https://example.com'}})
// @ts-expect-error The renderer supplies the placeholder document.
renderYouTubeEmbed({...video, iframeAttributes: {srcdoc: '<p>Custom document</p>'}})
