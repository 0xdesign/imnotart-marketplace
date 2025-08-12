import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

interface SendDownloadEmailParams {
  buyerEmail: string
  artworkTitle: string
  artistName: string
  downloadToken: string
  purchaseAmount: number
}

export async function sendDownloadEmail({
  buyerEmail,
  artworkTitle,
  artistName,
  downloadToken,
  purchaseAmount
}: SendDownloadEmailParams) {
  const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/download/${downloadToken}`
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your NFT Purchase - ImNotArt</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
          .content { padding: 20px 0; }
          .download-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #007bff;">ImNotArt</h1>
            <p style="margin: 5px 0 0 0;">Your NFT wallpaper is ready!</p>
          </div>
          
          <div class="content">
            <h2>Thank you for your purchase!</h2>
            
            <p>You've successfully purchased "<strong>${artworkTitle}</strong>" by ${artistName} for $${purchaseAmount}.</p>
            
            <p>Click the button below to download your high-resolution wallpaper:</p>
            
            <p style="text-align: center;">
              <a href="${downloadUrl}" class="download-button">Download Your Wallpaper</a>
            </p>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This download link will expire in 7 days</li>
              <li>You can download the file up to 3 times</li>
              <li>If you provided a wallet address, your NFT will be minted within 24 hours</li>
            </ul>
            
            <p>If you have any questions or issues, please contact our support team.</p>
            
            <p>Enjoy your new wallpaper!</p>
          </div>
          
          <div class="footer">
            <p>This email was sent because you purchased an NFT wallpaper from ImNotArt.</p>
            <p>© 2025 ImNotArt. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: buyerEmail,
      subject: `Your NFT Purchase: ${artworkTitle}`,
      html: htmlContent,
    })

    console.log(`Download email sent to ${buyerEmail}`)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}