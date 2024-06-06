module.exports = {
  formattedDate: (timestamp) => {
    let date = new Date(timestamp);
    let options = { day: 'numeric', month: 'long', year: 'numeric' };
    let formattedDate = new Intl.DateTimeFormat('id-ID', options).format(date);
    return formattedDate;
  },
};
