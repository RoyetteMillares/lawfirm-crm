import puppeteer from "puppeteer"
import { SignatureField } from "./document-template-utils"

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

    // We wrap the content in a container that simulates the margins and page width
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
            
            body {
              margin: 0;
              padding: 0;
              font-family: sans-serif;
              -webkit-print-color-adjust: exact;
            }
            .page-container {
              width: 816px; /* 8.5in at 96dpi */
              padding: 48px; /* 0.5in margins simulated as padding */
              margin: 0 auto;
              box-sizing: border-box;
              position: relative; /* Establish context for absolute positioning if needed */
            }
            p { margin-bottom: 1em; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="page-container">
            ${input.html}
          </div>
        </body>
      </html>
    `

    await page.setContent(htmlContent, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    })

    if (input.signatureFields?.length) {
      await page.addStyleTag({
        content: `
          .signature-field {
            position: absolute;
            border: 2px dashed #1d4ed8;
            background-color: rgba(239, 246, 255, 0.5);
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            color: #1d4ed8;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            box-sizing: border-box;
          }
          .signature-field.signed {
            border: none;
            background-color: transparent;
          }
        `,
      })

      await page.evaluate((fields) => {
        fields.forEach((field) => {
          const div = document.createElement("div")
          div.className = "signature-field"
          
          // Apply positioning
          div.style.left = `${field.x}px`
          div.style.top = `${field.y}px`
          div.style.width = `${field.width}px`
          div.style.height = `${field.height}px`
          
          if (field.value) {
             div.classList.add('signed')
             const img = document.createElement('img')
             img.src = field.value
             img.style.width = "100%"
             img.style.height = "100%"
             img.style.objectFit = "contain"
             div.appendChild(img)
          } else {
             div.innerText = field.label || field.name || "Sign Here"
          }
          
          document.body.appendChild(div)
        })
      }, input.signatureFields)
    }

    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }, 
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
