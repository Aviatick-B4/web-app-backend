const { transporter } = require('../libs/nodemailer');

module.exports = async (mailOptions) => {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email: ', error);
      return false;
    } else {
      console.log('Email sent: ', info.response);
    }
  });
};
