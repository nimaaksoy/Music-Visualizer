# Music Visualizer

![Music Visualizer preview](./bg-readme.png)

Browser-based music visualizer for creating shareable landscape and portrait videos from a local audio file. Everything runs client-side in the browser.

## Demo

- Live sample: [mv.nimaaksoy.com](https://mv.nimaaksoy.com)
- Sponsor: [Bowora.com](https://bowora.com)

## Features

- Upload a local audio file
- Add track title and custom text overlays
- Pick from multiple visualizer styles
- Use preset backgrounds or upload your own image/video
- Export landscape and portrait video outputs locally
- Keep processing private with no server upload

## Privacy

- No backend
- No cloud processing
- Nothing is uploaded unless you choose to publish the exported file yourself

## Tech

- Vanilla HTML, CSS, and JavaScript
- Web Audio API for audio analysis
- Canvas 2D for rendering
- MediaRecorder for local export

## Local Run

You can open `index.html` directly, but a local server is more reliable for browser media APIs.

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Credits

- Concept inspiration: [AlexVestin/musicvid.org](https://github.com/AlexVestin/musicvid.org).
- Typography uses [Inter](https://github.com/rsms/inter) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) via Google Fonts.
- Sponsor support by [Bowora.com](https://bowora.com).
- This repository is a standalone vanilla HTML/CSS/JavaScript implementation and does not bundle code from `musicvid.org`.
