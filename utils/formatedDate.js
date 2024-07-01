module.exports = {
  convertDate: (date) => {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString();
  },
};
