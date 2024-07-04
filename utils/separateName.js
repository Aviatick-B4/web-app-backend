module.exports = (fullName) => {
  const nameParts = fullName.split(' ');
  const familyName = nameParts.length > 1 ? nameParts.pop() : null;
  const firstName = nameParts.join(' ');
  
  return { firstName, familyName }
}
