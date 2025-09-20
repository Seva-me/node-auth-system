const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
  // Create transporter (Gmail SMTP)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Mail options
  const mailOptions = {
    from: `"Auth System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  // Send email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
