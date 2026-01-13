const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  const svgContent = `
  <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 512px; height: 512px;">
    <defs>
      <linearGradient id="cyber-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#00f3ff" />
        <stop offset="100%" stop-color="#7000ff" />
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path d="M256 30 L470 140 V372 L256 482 L42 372 V140 Z" fill="transparent" stroke="url(#cyber-grad)" stroke-width="24" />
    <path d="M100 256 H170 L210 130 L290 382 L330 256 H412" stroke="url(#cyber-grad)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />
    <circle cx="412" cy="256" r="16" fill="#00f3ff" filter="url(#glow)" />
  </svg>`

  const html = `
    <html>
    <body style="margin: 0; padding: 0; background: transparent; overflow: hidden;">
      ${svgContent}
    </body>
    </html>
  `

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  
  setTimeout(async () => {
    try {
      const image = await win.webContents.capturePage()
      const outputPath = path.join(__dirname, '../resources/icon.png')
      fs.writeFileSync(outputPath, image.toPNG())
      console.log(`Icon generated successfully at ${outputPath}`)
      app.quit()
    } catch (e) {
      console.error(e)
      app.exit(1)
    }
  }, 2000)
})