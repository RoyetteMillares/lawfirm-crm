import PDFDocument from "pdfkit"

export async function generatePdf(input: {
  html: string
  signatureFields?: Array<{
    id: string
    name: string
    label: string
    x: number
    y: number
    width: number
    height: number
  }>
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "letter",
        margin: 50,
      })

      const chunks: Buffer[] = []

      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Parse HTML content and add to PDF
      // For MVP, convert basic HTML to PDF text
      const plainText = input.html
        .replace(/<[^>]*>/g, "") // Strip HTML tags
        .trim()

      doc.font("Helvetica", 12).text(plainText, {
        align: "left",
        width: 500,
      })

      // Add signature fields as placeholders
      if (input.signatureFields && input.signatureFields.length > 0) {
        doc.moveDown(2)
        doc.font("Helvetica-Bold", 10).text("Signature Fields:")

        for (const field of input.signatureFields) {
          doc.font("Helvetica", 10).text(
            `____________________________________ (${field.label})`,
            { align: "left" }
          )
          doc.moveDown(0.5)
        }
      }

      // Footer with timestamp
      doc
        .font("Helvetica", 8)
        .text(`Generated: ${new Date().toISOString()}`, {
          align: "center",
          color: "#999999",
        })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
