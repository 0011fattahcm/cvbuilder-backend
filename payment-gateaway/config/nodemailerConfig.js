import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const sendPaymentSuccessEmail = async (payerEmail, amount, referenceId) => {
  const formattedAmount = `Rp ${amount.toLocaleString('id-ID')},00`;
  const date = new Date().toLocaleString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: payerEmail,
    subject: '✅ Pembayaran Sukses | CV Builder JECA',
    html: `
      <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; max-width: 480px; margin: auto;">
        <h2 style="color: #007bff;">Pembayaran Berhasil 🎉</h2>
        <p>Terima kasih telah menggunakan <strong>CV Builder JECA</strong>.</p>
        <hr />
        <p><strong>Nominal:</strong> ${formattedAmount}</p>
        <p><strong>Reference ID:</strong> ${referenceId}</p>
        <p><strong>Tanggal:</strong> ${date}</p>
        <hr />
        <p>Anda sekarang dapat melakukan ekspor CV hingga <strong>2 kali</strong>.</p>
        <p>Salam sukses,</p>
        <p style="font-weight: bold; color: #007bff;">Tim JECA</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📨 Email resi terkirim ke:', payerEmail);
  } catch (error) {
    console.error('❌ Error kirim resi email:', error);
  }
};

export { sendPaymentSuccessEmail };
