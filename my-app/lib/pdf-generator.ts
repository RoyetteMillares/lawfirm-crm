import puppeteer from "puppeteer"

type SignatureField = {
  id: string
  name: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

interface GeneratePdfInput {
  html: string
  signatureFields?: SignatureField[]
}

export async function generatePdf(input: GeneratePdfInput): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === "production",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  try {
    const page = await browser.newPage()

    await page.setContent(input.html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    })

    if (input.signatureFields?.length) {
      await page.addStyleTag({
        content: `
          .signature-field {
            position: absolute;
            border: 1px dashed #1d4ed8;
            border-radius: 4px;
            font-size: 10px;
            color: #1d4ed8;
            padding: 2px 4px;
            background: rgba(255,255,255,0.8);
          }
        `,
      })

      await page.evaluate((fields) => {
        fields.forEach((field) => {
          const div = document.createElement("div")
          div.className = "signature-field"
          div.style.left = `${field.x}px`
          div.style.top = `${field.y}px`
          div.style.width = `${field.width}px`
          div.style.height = `${field.height}px`
          div.innerText = `${field.label || field.name}`
          document.body.appendChild(div)
        })
      }, input.signatureFields)
    }

    const pdfBuffer = await page.pdf({
      format: "Letter",
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      printBackground: true,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
