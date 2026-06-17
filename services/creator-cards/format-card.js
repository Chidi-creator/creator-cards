function formatCard(card) {
  const formatted = { ...card };
  formatted.id = formatted._id;
  delete formatted._id;
  delete formatted.__v;
  if (!formatted.deleted) {
    formatted.deleted = null;
  }
  return formatted;
}

module.exports = formatCard;
