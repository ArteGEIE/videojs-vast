export const isNumeric = (str) => {
  if (typeof str === 'number') {
    return true;
  }
  return !isNaN(str) && !isNaN(parseFloat(str));
}