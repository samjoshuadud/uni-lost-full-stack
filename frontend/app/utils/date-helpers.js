export const isDateInRange = (date, range) => {
  if (!range || (!range.from && !range.to)) return true;
  if (!date) return false;
  
  const itemDate = new Date(date);
  itemDate.setHours(0, 0, 0, 0);

  if (range.from && range.to) {
    const from = new Date(range.from);
    const to = new Date(range.to);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    return itemDate >= from && itemDate <= to;
  }

  if (range.from) {
    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    return itemDate >= from;
  }

  if (range.to) {
    const to = new Date(range.to);
    to.setHours(0, 0, 0, 0);
    return itemDate <= to;
  }

  return true;
}; 