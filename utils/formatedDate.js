module.exports = {
  formattedDate: (timestamp) => {
    let date = new Date(timestamp);
    let options = { day: 'numeric', month: 'long', year: 'numeric' };
    let formattedDate = new Intl.DateTimeFormat('id-ID', options).format(date);
    return formattedDate;
  },

  convertDate: (date) => {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString();
  },
};
