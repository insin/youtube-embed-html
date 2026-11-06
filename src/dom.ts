import {getYouTubeEmbed, type YouTubeEmbedOptions} from './index.js'
import {serializeAttributeValue} from './attributes.js'

/** Create an iframe in the browser. Importing this module is safe on the server. */
export function createYouTubeEmbed(options: YouTubeEmbedOptions): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  for (const [name, value] of Object.entries(getYouTubeEmbed(options))) {
    const serialized = serializeAttributeValue(name, value)
    if (serialized !== null) iframe.setAttribute(name, serialized)
  }
  return iframe
}
